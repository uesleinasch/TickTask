export interface DebouncedSerialQueue {
  /** Agenda `run` para daqui a `delayMs`; um novo agendamento da mesma chave substitui o anterior. */
  schedule: (key: string, run: () => Promise<void>, delayMs?: number) => void
  /** Cancela o pendente da chave e enfileira já. */
  now: (key: string, run: () => Promise<void>) => Promise<void>
}

/**
 * Tudo roda em fila única, um por vez: duas páginas novas na mesma seção nova criariam a seção duas
 * vezes no Notion se rodassem em paralelo.
 */
export function createDebouncedSerialQueue(defaultDelayMs: number): DebouncedSerialQueue {
  const pending = new Map<string, ReturnType<typeof setTimeout>>()
  let chain: Promise<void> = Promise.resolve()

  const enqueue = (run: () => Promise<void>): Promise<void> => {
    const job = chain.then(run)
    chain = job.catch(() => undefined)
    return job
  }

  const cancel = (key: string): void => {
    const timer = pending.get(key)
    if (timer) clearTimeout(timer)
    pending.delete(key)
  }

  return {
    schedule(key, run, delayMs = defaultDelayMs) {
      cancel(key)
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key)
          enqueue(run).catch(() => undefined)
        }, delayMs)
      )
    },
    now(key, run) {
      cancel(key)
      return enqueue(run)
    }
  }
}
