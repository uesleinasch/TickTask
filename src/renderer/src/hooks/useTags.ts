import { useState, useEffect, useCallback } from 'react'
import type { TagWithUsage, UpdateTagInput } from '@shared/types'

interface UseTagsReturn {
  tags: TagWithUsage[]
  loading: boolean
  refreshTags: () => Promise<void>
  createTag: (name: string, color?: string) => Promise<void>
  updateTag: (id: number, data: UpdateTagInput) => Promise<void>
  mergeTags: (sourceId: number, targetId: number) => Promise<number>
  deleteTag: (id: number) => Promise<void>
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<TagWithUsage[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTags = useCallback(async () => {
    setLoading(true)
    try {
      setTags(await window.api.listTagsWithUsage())
    } catch (error) {
      console.error('Falha ao carregar tags:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTags()
  }, [refreshTags])

  const createTag = useCallback(
    async (name: string, color?: string): Promise<void> => {
      await window.api.createTag(name, color)
      await refreshTags()
    },
    [refreshTags]
  )

  const updateTag = useCallback(
    async (id: number, data: UpdateTagInput): Promise<void> => {
      await window.api.updateTag(id, data)
      await refreshTags()
    },
    [refreshTags]
  )

  const mergeTags = useCallback(
    async (sourceId: number, targetId: number): Promise<number> => {
      const affected = await window.api.mergeTags(sourceId, targetId)
      await refreshTags()
      return affected
    },
    [refreshTags]
  )

  const deleteTag = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTag(id)
      await refreshTags()
    },
    [refreshTags]
  )

  return { tags, loading, refreshTags, createTag, updateTag, mergeTags, deleteTag }
}
