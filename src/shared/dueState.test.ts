import { describe, expect, it } from 'vitest'
import { dueState, localDateString } from './dueState'

const at = (iso: string): Date => new Date(iso)

describe('localDateString', () => {
  it('usa a data local, não a UTC', () => {
    expect(localDateString(new Date(2026, 9, 6, 23, 30))).toBe('2026-10-06')
  })
})

describe('dueState', () => {
  const now = at('2026-10-06T14:30:00')

  it('prazo de ontem está atrasado', () => {
    expect(dueState('2026-10-05', null, now)).toMatchObject({ kind: 'overdue', label: 'Atrasada' })
  })

  it('prazo hoje sem hora não está atrasado', () => {
    expect(dueState('2026-10-06', null, now)).toMatchObject({ kind: 'today', label: 'Hoje' })
  })

  it('prazo hoje com hora passada está atrasado; futura mostra a hora', () => {
    expect(dueState('2026-10-06', '14:00', now).kind).toBe('overdue')
    expect(dueState('2026-10-06', '18:00', now)).toMatchObject({
      kind: 'today',
      label: 'Hoje 18:00'
    })
  })

  it('amanhã, poucos dias e depois', () => {
    expect(dueState('2026-10-07', '09:30', now)).toMatchObject({
      kind: 'tomorrow',
      label: 'Amanhã 09:30'
    })
    expect(dueState('2026-10-09', null, now)).toMatchObject({ kind: 'soon', label: '3d' })
    expect(dueState('2026-10-20', null, now)).toMatchObject({ kind: 'later', label: '20/10' })
  })

  it('aceita due_date com hora embutida (formato legado)', () => {
    expect(dueState('2026-10-07 00:00:00', null, now).kind).toBe('tomorrow')
  })

  it('vira o mês corretamente', () => {
    expect(dueState('2026-11-01', null, at('2026-10-31T10:00:00')).kind).toBe('tomorrow')
  })
})
