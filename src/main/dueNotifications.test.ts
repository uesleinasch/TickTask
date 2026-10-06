import { describe, expect, it } from 'vitest'
import { pickDueNotifications, type DueTaskLike } from './dueNotifications'

const task = (overrides: Partial<DueTaskLike>): DueTaskLike => ({
  id: 1,
  name: 'Relatório',
  due_date: '2026-10-06',
  due_time: null,
  ...overrides
})

const at = (time: string, date = '2026-10-06'): Date => new Date(`${date}T${time}:00`)
const keys = (list: { key: string }[]): string[] => list.map((n) => n.key)

describe('pickDueNotifications', () => {
  it('prazo sem hora: avisa no dia a partir das 9h e na véspera', () => {
    expect(pickDueNotifications([task({})], at('08:59'), new Set())).toEqual([])
    expect(keys(pickDueNotifications([task({})], at('09:00'), new Set()))).toEqual(['1-today'])
    expect(
      keys(pickDueNotifications([task({ due_date: '2026-10-07' })], at('10:00'), new Set()))
    ).toEqual(['1-tomorrow'])
  })

  it('prazo com hora: avisa 15 min antes e na hora', () => {
    const t = task({ due_time: '18:00' })
    expect(keys(pickDueNotifications([t], at('17:44'), new Set()))).toEqual(['1-today'])
    const soon = pickDueNotifications([t], at('17:45'), new Set(['1-today']))
    expect(soon).toEqual([
      {
        key: '1-soon-2026-10-06-18:00',
        title: '⏰ Prazo às 18:00',
        body: '"Relatório" vence às 18:00.'
      }
    ])
    expect(
      keys(pickDueNotifications([t], at('18:00'), new Set(['1-today', '1-soon-2026-10-06-18:00'])))
    ).toEqual(['1-due-2026-10-06-18:00'])
  })

  it('não repete o que já foi avisado', () => {
    const t = task({ due_time: '18:00' })
    const sent = new Set(['1-today', '1-soon-2026-10-06-18:00', '1-due-2026-10-06-18:00'])
    expect(pickDueNotifications([t], at('18:01'), sent)).toEqual([])
  })

  it('não avisa "na hora" um prazo vencido há mais de 15 min (ex.: app aberto tarde)', () => {
    const t = task({ due_time: '18:00' })
    expect(keys(pickDueNotifications([t], at('18:20'), new Set(['1-today'])))).toEqual([])
  })

  it('perdeu a janela de 15 min antes mas chegou na hora: só o "na hora"', () => {
    const t = task({ due_time: '18:00' })
    expect(keys(pickDueNotifications([t], at('18:05'), new Set(['1-today'])))).toEqual([
      '1-due-2026-10-06-18:00'
    ])
  })

  it('mudar a hora do prazo no mesmo dia gera aviso novo', () => {
    const sent = new Set(['1-today', '1-soon-2026-10-06-18:00'])
    expect(keys(pickDueNotifications([task({ due_time: '18:30' })], at('18:20'), sent))).toEqual([
      '1-soon-2026-10-06-18:30'
    ])
  })
})
