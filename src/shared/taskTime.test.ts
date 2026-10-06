import { describe, expect, it } from 'vitest'
import { addMinutes, formatTimeRange, normalizeTaskTimes, taskTimeError } from './taskTime'

describe('normalizeTaskTimes', () => {
  it('mantém horários válidos', () => {
    expect(
      normalizeTaskTimes({
        scheduled_date: '2026-10-06',
        scheduled_time: '09:00',
        scheduled_end_time: '10:30',
        due_date: '2026-10-07',
        due_time: '18:00'
      })
    ).toEqual({ scheduled_time: '09:00', scheduled_end_time: '10:30', due_time: '18:00' })
  })

  it('hora sem data some', () => {
    expect(
      normalizeTaskTimes({
        scheduled_date: null,
        scheduled_time: '09:00',
        scheduled_end_time: '10:00',
        due_date: null,
        due_time: '18:00'
      })
    ).toEqual({ scheduled_time: null, scheduled_end_time: null, due_time: null })
  })

  it('fim sem início ou fim antes do início é descartado', () => {
    const base = { scheduled_date: '2026-10-06', due_date: null }
    expect(normalizeTaskTimes({ ...base, scheduled_end_time: '10:00' }).scheduled_end_time).toBe(
      null
    )
    expect(
      normalizeTaskTimes({ ...base, scheduled_time: '10:00', scheduled_end_time: '09:00' })
        .scheduled_end_time
    ).toBe(null)
  })

  it('formato inválido vira null', () => {
    expect(
      normalizeTaskTimes({ scheduled_date: '2026-10-06', scheduled_time: '9h' }).scheduled_time
    ).toBe(null)
  })
})

describe('taskTimeError', () => {
  it('aponta a regra violada', () => {
    expect(taskTimeError({ scheduled_time: '09:00' })).toMatch(/scheduled_date/)
    expect(taskTimeError({ due_time: '18:00' })).toMatch(/due_date/)
    expect(taskTimeError({ scheduled_date: '2026-10-06', scheduled_end_time: '10:00' })).toMatch(
      /scheduled_time/
    )
    expect(
      taskTimeError({
        scheduled_date: '2026-10-06',
        scheduled_time: '10:00',
        scheduled_end_time: '10:00'
      })
    ).toMatch(/depois/)
    expect(taskTimeError({ scheduled_date: '2026-10-06', scheduled_time: '25:00' })).toMatch(
      /HH:MM/
    )
    expect(
      taskTimeError({ scheduled_date: '2026-10-06', scheduled_time: '09:00', due_time: null })
    ).toBe(null)
  })
})

describe('addMinutes', () => {
  it('soma na hora de parede e vira o dia', () => {
    expect(addMinutes('2026-10-06', '09:00', 90)).toEqual({ date: '2026-10-06', time: '10:30' })
    expect(addMinutes('2026-12-31', '23:30', 60)).toEqual({ date: '2027-01-01', time: '00:30' })
  })
})

describe('formatTimeRange', () => {
  it('formata início e fim', () => {
    expect(formatTimeRange('09:00', '10:00')).toBe('09:00–10:00')
    expect(formatTimeRange('09:00', null)).toBe('09:00')
    expect(formatTimeRange(null, '10:00')).toBe('')
  })
})
