import { describe, expect, it } from 'vitest'
import { createConfirmStore, needsConfirmation } from './confirmGuard'

const OP = { kind: 'delete_tasks', payload: { ids: [1, 2] } }

function storeAt(start = 1000): {
  store: ReturnType<typeof createConfirmStore>
  tick: (ms: number) => void
} {
  let clock = start
  const store = createConfirmStore({ ttlMs: 5000, now: () => clock, makeId: () => 'fixo' })
  return {
    store,
    tick: (ms) => {
      clock += ms
    }
  }
}

describe('needsConfirmation', () => {
  it('sempre exige confirmação para deleção', () => {
    expect(needsConfirmation('delete_tasks', 1, 5)).toBe(true)
    expect(needsConfirmation('delete_structure', 1, 5)).toBe(true)
    expect(needsConfirmation('merge_tags', 1, 5)).toBe(true)
    expect(needsConfirmation('replace_notes', 1, 5)).toBe(true)
  })

  it('exige confirmação em lote só acima do limite', () => {
    expect(needsConfirmation('bulk_update_tasks', 5, 5)).toBe(false)
    expect(needsConfirmation('bulk_update_tasks', 6, 5)).toBe(true)
    expect(needsConfirmation('plan_day', 6, 5)).toBe(true)
  })
})

describe('createConfirmStore', () => {
  it('aceita o token na mesma operação', () => {
    const { store } = storeAt()
    const token = store.issue(OP)
    expect(store.consume(token, OP)).toEqual({ ok: true })
  })

  it('recusa o mesmo token duas vezes', () => {
    const { store } = storeAt()
    const token = store.issue(OP)
    store.consume(token, OP)
    expect(store.consume(token, OP).ok).toBe(false)
  })

  it('recusa token expirado', () => {
    const { store, tick } = storeAt()
    const token = store.issue(OP)
    tick(5001)
    expect(store.consume(token, OP)).toEqual({
      ok: false,
      code: 'invalid_token',
      message: 'Confirmação expirada. Repita a operação para ver o preview de novo.'
    })
  })

  it('recusa token usado para outra operação', () => {
    const { store } = storeAt()
    const token = store.issue(OP)
    expect(store.consume(token, { kind: 'delete_tasks', payload: { ids: [1, 3] } }).ok).toBe(false)
  })

  it('recusa token desconhecido', () => {
    const { store } = storeAt()
    expect(store.consume('inexistente', OP).ok).toBe(false)
  })

  it('não confunde operações de tipos diferentes com o mesmo payload', () => {
    const { store } = storeAt()
    const token = store.issue({ kind: 'delete_tasks', payload: { ids: [1] } })
    expect(store.consume(token, { kind: 'plan_day', payload: { ids: [1] } }).ok).toBe(false)
  })
})
