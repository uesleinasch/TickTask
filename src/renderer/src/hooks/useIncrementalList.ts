import { useEffect, useMemo, useRef, useState } from 'react'

interface UseIncrementalListReturn<T> {
  visible: T[]
  hasMore: boolean
  remaining: number
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

const DEFAULT_PAGE_SIZE = 60

/**
 * Renderiza a lista em lotes: o primeiro lote entra no DOM imediatamente e os
 * seguintes só quando a sentinela se aproxima da área visível.
 */
export function useIncrementalList<T>(
  items: T[],
  resetKey: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): UseIncrementalListReturn<T> {
  const [count, setCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCount(pageSize)
  }, [resetKey, pageSize])

  const hasMore = count < items.length

  useEffect(() => {
    const node = sentinelRef.current
    if (!hasMore || !node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCount((current) => Math.min(current + pageSize, items.length))
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, items.length, pageSize])

  const visible = useMemo(() => (hasMore ? items.slice(0, count) : items), [items, count, hasMore])

  return { visible, hasMore, remaining: items.length - visible.length, sentinelRef }
}
