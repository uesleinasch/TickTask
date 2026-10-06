import { describe, expect, it, vi } from 'vitest'
import { createCalendarApi, reconcileTaskEvents, GoogleApiError } from './googleCalendarApi'
import type { DesiredEvent } from './gcalPlan'

interface Call {
  method: string
  path: string
  body?: Record<string, unknown>
  auth?: string
}

type Handler = (call: Call) => { status: number; body?: unknown } | Error

function fakeFetch(handler: Handler): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = []
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url)
    const call: Call = {
      method: init?.method ?? 'GET',
      path: parsed.pathname.replace('/calendar/v3', '') + parsed.search,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      auth: (init?.headers as Record<string, string>)?.Authorization
    }
    calls.push(call)
    const result = handler(call)
    if (result instanceof Error) throw result
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), {
      status: result.status
    })
  })
  return { fetch: fetchFn as unknown as typeof fetch, calls }
}

const event: DesiredEvent = {
  id: 'tick464s',
  summary: 'Revisar',
  description: 'TickTask #464',
  start: { date: '2026-10-06' },
  end: { date: '2026-10-07' }
}

const noSleep = async (): Promise<void> => {}

describe('createCalendarApi', () => {
  it('lista eventos da task pela propriedade privada, incluindo apagados e paginando', async () => {
    const { fetch, calls } = fakeFetch((call) =>
      call.path.includes('pageToken=p2')
        ? { status: 200, body: { items: [{ id: 'b' }] } }
        : { status: 200, body: { items: [{ id: 'a' }], nextPageToken: 'p2' } }
    )
    const api = createCalendarApi({ fetch, getAccessToken: async () => 'tok', sleep: noSleep })

    const events = await api.listTaskEvents('cal@group', 464, 'America/Sao_Paulo')

    expect(events.map((e) => e.id)).toEqual(['a', 'b'])
    const query = new URLSearchParams(calls[0].path.split('?')[1])
    expect(calls[0].path.startsWith('/calendars/cal%40group/events?')).toBe(true)
    expect(query.get('privateExtendedProperty')).toBe('taskId=464')
    expect(query.get('showDeleted')).toBe('true')
    expect(query.get('timeZone')).toBe('America/Sao_Paulo')
    expect(calls[0].auth).toBe('Bearer tok')
  })

  it('401 renova o token uma vez e repete', async () => {
    let attempt = 0
    const { fetch, calls } = fakeFetch(() =>
      attempt++ === 0 ? { status: 401, body: {} } : { status: 200, body: { id: 'cal' } }
    )
    const getAccessToken = vi.fn(async (force: boolean) => (force ? 'novo' : 'velho'))
    const api = createCalendarApi({ fetch, getAccessToken, sleep: noSleep })

    await expect(api.createCalendar('TickTask', 'UTC')).resolves.toBe('cal')
    expect(getAccessToken).toHaveBeenLastCalledWith(true)
    expect(calls.map((c) => c.auth)).toEqual(['Bearer velho', 'Bearer novo'])
  })

  it('5xx e falha de rede ganham uma nova tentativa; a segunda falha propaga', async () => {
    const { fetch, calls } = fakeFetch(() => ({
      status: 503,
      body: { error: { message: 'busy' } }
    }))
    const sleep = vi.fn(noSleep)
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep })

    await expect(api.createCalendar('TickTask', 'UTC')).rejects.toThrow('busy')
    expect(calls).toHaveLength(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('insert grava a marca da task e o status confirmado', async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 200, body: {} }))
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })

    await api.insertEvent('cal', 464, event)

    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/calendars/cal/events',
      body: {
        ...event,
        status: 'confirmed',
        extendedProperties: { private: { taskId: '464' } }
      }
    })
  })
})

describe('reconcileTaskEvents', () => {
  it('aplica as operações do plano', async () => {
    const { fetch, calls } = fakeFetch((call) =>
      call.method === 'GET'
        ? { status: 200, body: { items: [{ id: 'tick464b9', status: 'confirmed' }] } }
        : call.method === 'DELETE'
          ? { status: 204 }
          : { status: 200, body: {} }
    )
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })

    const result = await reconcileTaskEvents(api, {
      calendarId: 'cal',
      taskId: 464,
      desired: [event],
      timeZone: 'UTC',
      recreateCalendar: vi.fn()
    })

    expect(result).toEqual({ calendarId: 'cal', applied: 2 })
    expect(calls.slice(1).map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /calendars/cal/events',
      'DELETE /calendars/cal/events/tick464b9'
    ])
  })

  it('409 no insert vira update do mesmo id', async () => {
    const { fetch, calls } = fakeFetch((call) =>
      call.method === 'GET'
        ? { status: 200, body: { items: [] } }
        : call.method === 'POST'
          ? { status: 409, body: { error: { message: 'duplicate' } } }
          : { status: 200, body: {} }
    )
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })

    await reconcileTaskEvents(api, {
      calendarId: 'cal',
      taskId: 464,
      desired: [event],
      timeZone: 'UTC',
      recreateCalendar: vi.fn()
    })

    expect(calls.at(-1)).toMatchObject({ method: 'PUT', path: '/calendars/cal/events/tick464s' })
  })

  it('agenda apagada no Google é recriada e os eventos vão para a nova', async () => {
    const { fetch, calls } = fakeFetch((call) =>
      call.method === 'GET' ? { status: 404, body: {} } : { status: 200, body: {} }
    )
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })
    const recreateCalendar = vi.fn(async () => 'nova')

    const result = await reconcileTaskEvents(api, {
      calendarId: 'velha',
      taskId: 464,
      desired: [event],
      timeZone: 'UTC',
      recreateCalendar
    })

    expect(result).toEqual({ calendarId: 'nova', applied: 1 })
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/calendars/nova/events' })
  })

  it('agenda apagada sem nada a criar não recria a agenda', async () => {
    const { fetch } = fakeFetch(() => ({ status: 404, body: {} }))
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })
    const recreateCalendar = vi.fn(async () => 'nova')

    await reconcileTaskEvents(api, {
      calendarId: 'velha',
      taskId: 464,
      desired: [],
      timeZone: 'UTC',
      recreateCalendar
    })

    expect(recreateCalendar).not.toHaveBeenCalled()
  })

  it('delete de evento que já sumiu não é erro', async () => {
    const { fetch } = fakeFetch((call) =>
      call.method === 'GET'
        ? { status: 200, body: { items: [{ id: 'tick464s', status: 'confirmed' }] } }
        : { status: 410, body: {} }
    )
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })

    await expect(
      reconcileTaskEvents(api, {
        calendarId: 'cal',
        taskId: 464,
        desired: [],
        timeZone: 'UTC',
        recreateCalendar: vi.fn()
      })
    ).resolves.toEqual({ calendarId: 'cal', applied: 1 })
  })

  it('erro de API carrega o status', async () => {
    const { fetch } = fakeFetch(() => ({ status: 403, body: { error: { message: 'quota' } } }))
    const api = createCalendarApi({ fetch, getAccessToken: async () => 't', sleep: noSleep })

    const error = await api.createCalendar('x', 'UTC').catch((e) => e)
    expect(error).toBeInstanceOf(GoogleApiError)
    expect(error.status).toBe(403)
  })
})
