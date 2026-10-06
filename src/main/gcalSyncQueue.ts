export function createKeyedQueue(
  run: (key: number) => Promise<void>
): (key: number) => Promise<void> {
  const running = new Map<number, Promise<void>>()
  const dirty = new Set<number>()

  return function schedule(key: number): Promise<void> {
    const current = running.get(key)
    if (current) {
      dirty.add(key)
      return current
    }

    const loop = (async (): Promise<void> => {
      let lastError: unknown = null
      try {
        do {
          dirty.delete(key)
          try {
            await run(key)
            lastError = null
          } catch (error) {
            lastError = error
          }
        } while (dirty.has(key))
      } finally {
        running.delete(key)
      }
      if (lastError) throw lastError
    })()

    running.set(key, loop)
    return loop
  }
}
