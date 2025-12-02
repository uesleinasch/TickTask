import { useCallback, useRef } from 'react'

interface UseNotificationReturn {
  notify: (title: string, body: string) => void
}

export function useNotification(): UseNotificationReturn {
  const lastNotificationRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const notify = useCallback((title: string, body: string) => {
    const key = `${title}-${body}`

    // Debounce: não repetir a mesma notificação em 5 segundos
    if (lastNotificationRef.current === key) {
      return
    }

    lastNotificationRef.current = key
    window.api.showNotification(title, body)

    // Limpar após 5 segundos
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      lastNotificationRef.current = ''
    }, 5000)
  }, [])

  return { notify }
}
