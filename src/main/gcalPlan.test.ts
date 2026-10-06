import { describe, expect, it } from 'vitest'
import {
  buildDesiredEvents,
  planOps,
  type DesiredEvent,
  type ExistingEvent,
  type GcalBlockInput,
  type GcalTaskInput
} from './gcalPlan'

const TZ = 'America/Sao_Paulo'

function task(overrides: Partial<GcalTaskInput> = {}): GcalTaskInput {
  return {
    id: 464,
    name: 'Revisar contrato',
    description: null,
    status: 'proximas',
    project_name: null,
    scheduled_date: null,
    due_date: null,
    gcal_sync: true,
    ...overrides
  }
}

const block: GcalBlockInput = { id: 12, date: '2026-10-06', start_time: '09:00', end_time: '10:30' }

function asExisting(event: DesiredEvent, offset = '-03:00'): ExistingEvent {
  const time = (t: DesiredEvent['start']): ExistingEvent['start'] =>
    'date' in t ? { date: t.date } : { dateTime: `${t.dateTime}${offset}`, timeZone: t.timeZone }
  return {
    id: event.id,
    status: 'confirmed',
    summary: event.summary,
    description: event.description,
    start: time(event.start),
    end: time(event.end)
  }
}

describe('buildDesiredEvents', () => {
  it('não gera nada para task inexistente ou sem sync', () => {
    expect(buildDesiredEvents(null, [block], TZ)).toEqual([])
    expect(buildDesiredEvents(task({ gcal_sync: false }), [block], TZ)).toEqual([])
  })

  it('transforma cada bloco num evento com hora no fuso informado', () => {
    const [event] = buildDesiredEvents(task(), [block], TZ)
    expect(event).toEqual({
      id: 'tick464b12',
      summary: 'Revisar contrato',
      description: 'TickTask #464',
      start: { dateTime: '2026-10-06T09:00:00', timeZone: TZ },
      end: { dateTime: '2026-10-06T10:30:00', timeZone: TZ }
    })
  })

  it('ignora bloco com fim antes ou igual ao início', () => {
    const broken = { ...block, end_time: '09:00' }
    expect(buildDesiredEvents(task(), [broken], TZ)).toEqual([])
  })

  it('data agendada vira evento de dia inteiro terminando no dia seguinte', () => {
    const events = buildDesiredEvents(task({ scheduled_date: '2026-12-31' }), [], TZ)
    expect(events).toEqual([
      expect.objectContaining({
        id: 'tick464s',
        summary: 'Revisar contrato',
        start: { date: '2026-12-31' },
        end: { date: '2027-01-01' }
      })
    ])
  })

  it('prazo vira evento de dia inteiro com prefixo e usa só a parte da data', () => {
    const events = buildDesiredEvents(task({ due_date: '2026-02-28 18:00:00' }), [], TZ)
    expect(events).toEqual([
      expect.objectContaining({
        id: 'tick464d',
        summary: 'Prazo: Revisar contrato',
        start: { date: '2026-02-28' },
        end: { date: '2026-03-01' }
      })
    ])
  })

  it('task finalizada ganha ✓ em todos os títulos', () => {
    const events = buildDesiredEvents(
      task({ status: 'finalizada', scheduled_date: '2026-10-06', due_date: '2026-10-07' }),
      [block],
      TZ
    )
    expect(events.map((e) => e.summary)).toEqual([
      '✓ Revisar contrato',
      '✓ Revisar contrato',
      '✓ Prazo: Revisar contrato'
    ])
  })

  it('descrição traz o texto da task, o id e o projeto', () => {
    const [event] = buildDesiredEvents(
      task({ description: 'Ver cláusula 4', project_name: 'Jurídico' }),
      [block],
      TZ
    )
    expect(event.description).toBe('Ver cláusula 4\n\nTickTask #464 · Jurídico')
  })
})

describe('buildDesiredEvents com horário', () => {
  it('programado com início e fim vira evento com hora', () => {
    const [event] = buildDesiredEvents(
      task({ scheduled_date: '2026-10-06', scheduled_time: '14:00', scheduled_end_time: '15:30' }),
      [],
      TZ
    )
    expect(event).toMatchObject({
      id: 'tick464s',
      start: { dateTime: '2026-10-06T14:00:00', timeZone: TZ },
      end: { dateTime: '2026-10-06T15:30:00', timeZone: TZ }
    })
  })

  it('sem fim usa o limite de tempo da task ou 1h, virando o dia se preciso', () => {
    const [comLimite] = buildDesiredEvents(
      task({ scheduled_date: '2026-10-06', scheduled_time: '09:00', time_limit_seconds: 1800 }),
      [],
      TZ
    )
    expect(comLimite.end).toEqual({ dateTime: '2026-10-06T09:30:00', timeZone: TZ })

    const [tarde] = buildDesiredEvents(
      task({ scheduled_date: '2026-12-31', scheduled_time: '23:30' }),
      [],
      TZ
    )
    expect(tarde.end).toEqual({ dateTime: '2027-01-01T00:30:00', timeZone: TZ })
  })

  it('prazo com hora vira evento de 15 minutos', () => {
    const [event] = buildDesiredEvents(task({ due_date: '2026-10-07', due_time: '18:00' }), [], TZ)
    expect(event).toMatchObject({
      id: 'tick464d',
      summary: 'Prazo: Revisar contrato',
      start: { dateTime: '2026-10-07T18:00:00', timeZone: TZ },
      end: { dateTime: '2026-10-07T18:15:00', timeZone: TZ }
    })
  })

  it('perder a hora volta a dia inteiro e gera update do mesmo id', () => {
    const timed = buildDesiredEvents(
      task({ scheduled_date: '2026-10-06', scheduled_time: '09:00' }),
      [],
      TZ
    )
    const allDay = buildDesiredEvents(task({ scheduled_date: '2026-10-06' }), [], TZ)
    expect(
      planOps(
        allDay,
        timed.map((e) => asExisting(e))
      )
    ).toEqual([{ kind: 'update', event: allDay[0] }])
  })
})

describe('planOps', () => {
  const desired = buildDesiredEvents(task({ scheduled_date: '2026-10-06' }), [block], TZ)

  it('insere o que não existe no Google', () => {
    expect(planOps(desired, [])).toEqual(desired.map((event) => ({ kind: 'insert', event })))
  })

  it('não faz nada quando o Google já está igual, mesmo com offset no dateTime', () => {
    expect(
      planOps(
        desired,
        desired.map((e) => asExisting(e))
      )
    ).toEqual([])
  })

  it('atualiza evento que mudou', () => {
    const existing = desired.map((e) => asExisting(e))
    existing[0] = { ...existing[0], summary: 'Nome antigo' }
    expect(planOps(desired, existing)).toEqual([{ kind: 'update', event: desired[0] }])
  })

  it('reativa evento cancelado com o mesmo id', () => {
    const existing = desired.map((e) => asExisting(e))
    existing[1] = { ...existing[1], status: 'cancelled' }
    expect(planOps(desired, existing)).toEqual([{ kind: 'update', event: desired[1] }])
  })

  it('apaga evento ativo que não é mais desejado e ignora os já cancelados', () => {
    const leftover = { ...asExisting(desired[0]), id: 'tick464b99' }
    const gone = { ...asExisting(desired[0]), id: 'tick464b98', status: 'cancelled' }
    expect(planOps([], [leftover, gone])).toEqual([{ kind: 'delete', id: 'tick464b99' }])
  })
})
