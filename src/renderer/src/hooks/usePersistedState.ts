import { useState, useCallback } from 'react'

/**
 * useState cujo valor é persistido em localStorage sob `key`.
 * Sobrevive a remontagens do componente e a reaberturas do app.
 * Tolerante a falhas: se o localStorage estiver indisponível, mantém o valor em memória.
 */
export function usePersistedState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setPersistedState = useCallback(
    (value: T) => {
      setState(value)
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // localStorage indisponível — mantém apenas em memória
      }
    },
    [key]
  )

  return [state, setPersistedState]
}
