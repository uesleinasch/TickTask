import { describe, expect, it } from 'vitest'
import { createKeyedQueue } from './gcalSyncQueue'

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

describe('createKeyedQueue', () => {
  it('pedidos durante uma execução viram exatamente uma execução extra', async () => {
    const gates = [deferred(), deferred()]
    const calls: number[] = []
    const schedule = createKeyedQueue(async (key) => {
      calls.push(key)
      await gates[calls.length - 1].promise
    })

    const first = schedule(7)
    schedule(7)
    schedule(7)
    const last = schedule(7)
    expect(calls).toEqual([7])

    gates[0].resolve()
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toEqual([7, 7])

    gates[1].resolve()
    await Promise.all([first, last])
    expect(calls).toEqual([7, 7])
  })

  it('chaves diferentes rodam em paralelo', async () => {
    const gate = deferred()
    const started: number[] = []
    const schedule = createKeyedQueue(async (key) => {
      started.push(key)
      await gate.promise
    })

    const runs = [schedule(1), schedule(2)]
    expect(started).toEqual([1, 2])
    gate.resolve()
    await Promise.all(runs)
  })

  it('rejeita com o erro da última execução e libera a chave', async () => {
    let fail = true
    const schedule = createKeyedQueue(async () => {
      if (fail) throw new Error('offline')
    })

    await expect(schedule(3)).rejects.toThrow('offline')
    fail = false
    await expect(schedule(3)).resolves.toBeUndefined()
  })
})
