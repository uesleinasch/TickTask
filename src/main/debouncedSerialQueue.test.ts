import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedSerialQueue } from './debouncedSerialQueue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createDebouncedSerialQueue', () => {
  it('agrupa agendamentos da mesma chave e roda só o último', async () => {
    const queue = createDebouncedSerialQueue(100)
    const calls: string[] = []
    queue.schedule('p:1', async () => void calls.push('a'))
    queue.schedule('p:1', async () => void calls.push('b'))
    queue.schedule('p:2', async () => void calls.push('c'))
    await vi.advanceTimersByTimeAsync(99)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual(['b', 'c'])
  })

  it('roda um por vez, na ordem, mesmo com erro no meio', async () => {
    const queue = createDebouncedSerialQueue(0)
    const log: string[] = []
    const slow = (name: string, ms: number) => async (): Promise<void> => {
      log.push(`${name}:start`)
      await new Promise((r) => setTimeout(r, ms))
      log.push(`${name}:end`)
    }
    const first = queue.now('a', slow('a', 50))
    const failing = queue.now('b', async () => {
      throw new Error('falhou')
    })
    const third = queue.now('c', slow('c', 10))
    await vi.advanceTimersByTimeAsync(100)
    await first
    await expect(failing).rejects.toThrow('falhou')
    await third
    expect(log).toEqual(['a:start', 'a:end', 'c:start', 'c:end'])
  })

  it('now cancela o agendado da mesma chave', async () => {
    const queue = createDebouncedSerialQueue(100)
    const calls: string[] = []
    queue.schedule('p:1', async () => void calls.push('agendado'))
    await queue.now('p:1', async () => void calls.push('agora'))
    await vi.advanceTimersByTimeAsync(200)
    expect(calls).toEqual(['agora'])
  })
})
