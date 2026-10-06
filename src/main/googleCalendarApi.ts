import { planOps, type DesiredEvent, type ExistingEvent } from './gcalPlan'
import type { FetchFn } from './googleOAuth'

const BASE_URL = 'https://www.googleapis.com/calendar/v3'
const RETRY_DELAY_MS = 1000

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'GoogleApiError'
  }
}

export interface CalendarApiDeps {
  fetch: FetchFn
  getAccessToken: (forceRefresh: boolean) => Promise<string>
  sleep?: (ms: number) => Promise<void>
}

export interface CalendarApi {
  createCalendar: (summary: string, timeZone: string) => Promise<string>
  listTaskEvents: (calendarId: string, taskId: number, timeZone: string) => Promise<ExistingEvent[]>
  insertEvent: (calendarId: string, taskId: number, event: DesiredEvent) => Promise<void>
  updateEvent: (calendarId: string, taskId: number, event: DesiredEvent) => Promise<void>
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function eventBody(taskId: number, event: DesiredEvent): Record<string, unknown> {
  return {
    ...event,
    status: 'confirmed',
    extendedProperties: { private: { taskId: String(taskId) } }
  }
}

export function createCalendarApi(deps: CalendarApiDeps): CalendarApi {
  const sleep = deps.sleep ?? defaultSleep

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let token = await deps.getAccessToken(false)
    let refreshed = false
    let retried = false

    for (;;) {
      let response: Response
      try {
        response = await deps.fetch(`${BASE_URL}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
          },
          body: body === undefined ? undefined : JSON.stringify(body)
        })
      } catch (error) {
        if (retried) throw error
        retried = true
        await sleep(RETRY_DELAY_MS)
        continue
      }

      if (response.status === 401 && !refreshed) {
        refreshed = true
        token = await deps.getAccessToken(true)
        continue
      }
      if ((response.status === 429 || response.status >= 500) && !retried) {
        retried = true
        await sleep(RETRY_DELAY_MS)
        continue
      }

      const text = await response.text()
      const data = text ? JSON.parse(text) : undefined
      if (!response.ok) {
        const message = data?.error?.message || `Google Calendar: HTTP ${response.status}`
        throw new GoogleApiError(response.status, message)
      }
      return data as T
    }
  }

  const eventsPath = (calendarId: string): string =>
    `/calendars/${encodeURIComponent(calendarId)}/events`

  return {
    async createCalendar(summary, timeZone) {
      const created = await request<{ id: string }>('POST', '/calendars', { summary, timeZone })
      return created.id
    },

    async listTaskEvents(calendarId, taskId, timeZone) {
      const events: ExistingEvent[] = []
      let pageToken: string | undefined
      do {
        const query = new URLSearchParams({
          privateExtendedProperty: `taskId=${taskId}`,
          showDeleted: 'true',
          timeZone,
          maxResults: '2500'
        })
        if (pageToken) query.set('pageToken', pageToken)
        const page = await request<{ items?: ExistingEvent[]; nextPageToken?: string }>(
          'GET',
          `${eventsPath(calendarId)}?${query}`
        )
        events.push(...(page.items ?? []))
        pageToken = page.nextPageToken
      } while (pageToken)
      return events
    },

    async insertEvent(calendarId, taskId, event) {
      await request('POST', eventsPath(calendarId), eventBody(taskId, event))
    },

    async updateEvent(calendarId, taskId, event) {
      await request(
        'PUT',
        `${eventsPath(calendarId)}/${encodeURIComponent(event.id)}`,
        eventBody(taskId, event)
      )
    },

    async deleteEvent(calendarId, eventId) {
      try {
        await request('DELETE', `${eventsPath(calendarId)}/${encodeURIComponent(eventId)}`)
      } catch (error) {
        if (error instanceof GoogleApiError && (error.status === 404 || error.status === 410)) return
        throw error
      }
    }
  }
}

export async function reconcileTaskEvents(
  api: CalendarApi,
  params: {
    calendarId: string
    taskId: number
    desired: DesiredEvent[]
    timeZone: string
    recreateCalendar: () => Promise<string>
  }
): Promise<{ calendarId: string; applied: number }> {
  let calendarId = params.calendarId
  let existing: ExistingEvent[]
  try {
    existing = await api.listTaskEvents(calendarId, params.taskId, params.timeZone)
  } catch (error) {
    if (!(error instanceof GoogleApiError && error.status === 404)) throw error
    if (params.desired.length === 0) return { calendarId, applied: 0 }
    calendarId = await params.recreateCalendar()
    existing = []
  }

  const ops = planOps(params.desired, existing)
  for (const op of ops) {
    if (op.kind === 'delete') {
      await api.deleteEvent(calendarId, op.id)
    } else if (op.kind === 'update') {
      await api.updateEvent(calendarId, params.taskId, op.event)
    } else {
      try {
        await api.insertEvent(calendarId, params.taskId, op.event)
      } catch (error) {
        if (!(error instanceof GoogleApiError && error.status === 409)) throw error
        await api.updateEvent(calendarId, params.taskId, op.event)
      }
    }
  }
  return { calendarId, applied: ops.length }
}
