import { useState, useEffect, useCallback } from 'react'
import type { Task, CreateTaskInput, TaskStatus } from '@shared/types'

interface UseTasksReturn {
  tasks: Task[]
  loading: boolean
  refreshTasks: () => Promise<void>
  createTask: (data: CreateTaskInput) => Promise<Task>
  deleteTask: (id: number) => Promise<void>
  archiveTask: (id: number) => Promise<void>
}

export function useTasks(archived: boolean = false): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTasks = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.listTasks(archived)
      console.log('[useTasks] Tasks carregadas:', result.length, result.map(t => ({ id: t.id, name: t.name, status: t.status })))
      setTasks(result)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [archived])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      const task = await window.api.createTask(data)
      await refreshTasks()
      return task
    },
    [refreshTasks]
  )

  const deleteTask = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTask(id)
      await refreshTasks()
    },
    [refreshTasks]
  )

  const archiveTask = useCallback(
    async (id: number): Promise<void> => {
      await window.api.archiveTask(id)
      await refreshTasks()
    },
    [refreshTasks]
  )

  return {
    tasks,
    loading,
    refreshTasks,
    createTask,
    deleteTask,
    archiveTask
  }
}

// Hook para filtrar tarefas por status
export function useFilteredTasks(
  tasks: Task[],
  statusFilter: TaskStatus | 'all'
): Task[] {
  console.log('[useFilteredTasks] Filter:', statusFilter, 'Total tasks:', tasks.length)
  
  if (statusFilter === 'all') {
    return tasks
  }
  
  const filtered = tasks.filter((task) => task.status === statusFilter)
  console.log('[useFilteredTasks] Filtered:', filtered.length)
  return filtered
}
