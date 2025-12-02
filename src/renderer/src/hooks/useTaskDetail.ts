import { useState, useEffect, useCallback } from 'react'
import type { Task, TimeEntry, UpdateTaskInput, TaskStatus } from '@shared/types'

interface UseTaskDetailReturn {
  task: Task | null
  timeEntries: TimeEntry[]
  loading: boolean
  refreshTask: () => Promise<void>
  updateTask: (data: UpdateTaskInput) => Promise<void>
  updateStatus: (status: TaskStatus) => Promise<void>
  archiveTask: () => Promise<void>
  unarchiveTask: () => Promise<void>
  deleteTask: () => Promise<void>
}

export function useTaskDetail(taskId: number): UseTaskDetailReturn {
  const [task, setTask] = useState<Task | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTask = useCallback(async () => {
    setLoading(true)
    try {
      const [taskResult, entriesResult] = await Promise.all([
        window.api.getTask(taskId),
        window.api.getTimeEntries(taskId)
      ])
      setTask(taskResult || null)
      setTimeEntries(entriesResult)
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    refreshTask()
  }, [refreshTask])

  const updateTask = useCallback(
    async (data: UpdateTaskInput): Promise<void> => {
      await window.api.updateTask(taskId, data)
      await refreshTask()
    },
    [taskId, refreshTask]
  )

  const updateStatus = useCallback(
    async (status: TaskStatus): Promise<void> => {
      await window.api.updateStatus(taskId, status)
      await refreshTask()
    },
    [taskId, refreshTask]
  )

  const archiveTask = useCallback(async (): Promise<void> => {
    await window.api.archiveTask(taskId)
  }, [taskId])

  const unarchiveTask = useCallback(async (): Promise<void> => {
    await window.api.unarchiveTask(taskId)
    await refreshTask()
  }, [taskId, refreshTask])

  const deleteTask = useCallback(async (): Promise<void> => {
    await window.api.deleteTask(taskId)
  }, [taskId])

  return {
    task,
    timeEntries,
    loading,
    refreshTask,
    updateTask,
    updateStatus,
    archiveTask,
    unarchiveTask,
    deleteTask
  }
}
