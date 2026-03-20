import { useState, useEffect, useCallback } from 'react'
import type { Context } from '@shared/types'

interface UseContextsReturn {
  contexts: Context[]
  loading: boolean
  refreshContexts: () => Promise<void>
  createContext: (name: string, icon?: string, color?: string) => Promise<Context>
  updateContext: (id: number, data: { name?: string; icon?: string; color?: string }) => Promise<void>
  deleteContext: (id: number) => Promise<void>
}

export function useContexts(): UseContextsReturn {
  const [contexts, setContexts] = useState<Context[]>([])
  const [loading, setLoading] = useState(true)

  const refreshContexts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.listContexts()
      setContexts(result)
    } catch (error) {
      console.error('Failed to load contexts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshContexts()
  }, [refreshContexts])

  const createContext = useCallback(
    async (name: string, icon?: string, color?: string): Promise<Context> => {
      const context = await window.api.createContext(name, icon, color)
      await refreshContexts()
      return context
    },
    [refreshContexts]
  )

  const updateContext = useCallback(
    async (id: number, data: { name?: string; icon?: string; color?: string }): Promise<void> => {
      await window.api.updateContext(id, data)
      await refreshContexts()
    },
    [refreshContexts]
  )

  const deleteContext = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteContext(id)
      await refreshContexts()
    },
    [refreshContexts]
  )

  return {
    contexts,
    loading,
    refreshContexts,
    createContext,
    updateContext,
    deleteContext
  }
}
