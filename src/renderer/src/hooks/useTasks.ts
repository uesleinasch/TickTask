import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, CreateTaskInput, TaskListFilters } from '@shared/types'

interface UseTasksReturn {
  tasks: Task[]
  total: number
  loading: boolean
  error: string | null
  refreshTasks: () => Promise<void>
  createTask: (data: CreateTaskInput) => Promise<Task>
  deleteTask: (id: number) => Promise<void>
  archiveTask: (id: number) => Promise<void>
}

const SEARCH_DEBOUNCE_MS = 250

export function useTasks(filters: TaskListFilters = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Serializado para que a identidade do objeto de filtros não dispare buscas redundantes.
  const filtersKey = JSON.stringify(filters)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const current = filtersRef.current
      const [result, count] = await Promise.all([
        window.api.listTasks(current),
        window.api.countTasks({ ...current, limit: undefined, offset: undefined })
      ])
      setTasks(result)
      setTotal(count)
      setError(null)
    } catch (err) {
      console.error('Falha ao carregar tarefas:', err)
      setError(err instanceof Error ? err.message : 'Falha ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const hasSearch = Boolean(filtersRef.current.search?.trim())
    if (!hasSearch) {
      fetchTasks()
      return
    }

    const timeout = setTimeout(fetchTasks, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [filtersKey, fetchTasks])

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      const task = await window.api.createTask(data)
      await fetchTasks()
      return task
    },
    [fetchTasks]
  )

  const deleteTask = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTask(id)
      await fetchTasks()
    },
    [fetchTasks]
  )

  const archiveTask = useCallback(
    async (id: number): Promise<void> => {
      await window.api.archiveTask(id)
      await fetchTasks()
    },
    [fetchTasks]
  )

  return {
    tasks,
    total,
    loading,
    error,
    refreshTasks: fetchTasks,
    createTask,
    deleteTask,
    archiveTask
  }
}
