import { useState, useEffect, useCallback } from 'react'
import type { Task, TimeBlock, CreateTimeBlockInput, UpdateTimeBlockInput } from '@shared/types'

// ===================== CALENDAR DATA =====================

interface UseCalendarDataReturn {
  // Scheduled tasks per week
  weekSchedule: { date: string; tasks: Task[] }[]
  // Time blocks
  timeBlocks: TimeBlock[]
  loading: boolean
  refresh: () => Promise<void>
  scheduleTask: (taskId: number, date: string | null) => Promise<void>
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  updateTimeBlock: (id: number, data: UpdateTimeBlockInput) => Promise<void>
  deleteTimeBlock: (id: number) => Promise<void>
}

export function useCalendarWeek(weekStartDate: string): UseCalendarDataReturn {
  const [weekSchedule, setWeekSchedule] = useState<{ date: string; tasks: Task[] }[]>([])
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [schedule, blocks] = await Promise.all([
        window.api.getWeeklySchedule(weekStartDate),
        window.api.getTimeBlocksForWeek(weekStartDate)
      ])
      setWeekSchedule(schedule)
      setTimeBlocks(blocks)
    } catch (error) {
      console.error('Failed to load calendar data:', error)
    } finally {
      setLoading(false)
    }
  }, [weekStartDate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const scheduleTask = useCallback(
    async (taskId: number, date: string | null) => {
      await window.api.scheduleTaskForDate(taskId, date)
      await refresh()
    },
    [refresh]
  )

  const createTimeBlock = useCallback(
    async (data: CreateTimeBlockInput): Promise<TimeBlock> => {
      const block = await window.api.createTimeBlock(data)
      await refresh()
      return block
    },
    [refresh]
  )

  const updateTimeBlock = useCallback(
    async (id: number, data: UpdateTimeBlockInput): Promise<void> => {
      await window.api.updateTimeBlock(id, data)
      await refresh()
    },
    [refresh]
  )

  const deleteTimeBlock = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTimeBlock(id)
      await refresh()
    },
    [refresh]
  )

  return {
    weekSchedule,
    timeBlocks,
    loading,
    refresh,
    scheduleTask,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock
  }
}

// ===================== MONTH DATA =====================

interface UseCalendarMonthReturn {
  timeBlocks: TimeBlock[]
  scheduledTasks: Task[]
  loading: boolean
  refresh: () => Promise<void>
  scheduleTask: (taskId: number, date: string | null) => Promise<void>
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  deleteTimeBlock: (id: number) => Promise<void>
}

export function useCalendarMonth(yearMonth: string): UseCalendarMonthReturn {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // Build the range for the month
      const [year, month] = yearMonth.split('-').map(Number)
      const firstDay = `${yearMonth}-01`
      const lastDay = new Date(year, month, 0)
      const lastDayStr = lastDay.toISOString().split('T')[0]

      // Load tasks for each day of month via weekly schedule calls
      const allTasks: Task[] = []
      let current = new Date(firstDay + 'T12:00:00')
      const end = new Date(lastDayStr + 'T12:00:00')

      // Collect 4-5 week ranges
      const weekStarts: string[] = []
      const seen = new Set<string>()
      const cursor = new Date(current)
      while (cursor <= end) {
        const weekStr = cursor.toISOString().split('T')[0]
        if (!seen.has(weekStr)) {
          seen.add(weekStr)
          weekStarts.push(weekStr)
        }
        cursor.setDate(cursor.getDate() + 7)
      }

      const [blocks, ...weekSchedules] = await Promise.all([
        window.api.getTimeBlocksForMonth(yearMonth),
        ...weekStarts.map((ws) => window.api.getWeeklySchedule(ws))
      ])

      for (const week of weekSchedules) {
        for (const day of week) {
          if (day.date >= firstDay && day.date <= lastDayStr) {
            for (const t of day.tasks) {
              if (!allTasks.find((x) => x.id === t.id)) allTasks.push(t)
            }
          }
        }
      }

      setTimeBlocks(blocks as TimeBlock[])
      setScheduledTasks(allTasks)
      current = end // stop loop
      void current
    } catch (error) {
      console.error('Failed to load month data:', error)
    } finally {
      setLoading(false)
    }
  }, [yearMonth])

  useEffect(() => {
    refresh()
  }, [refresh])

  const scheduleTask = useCallback(
    async (taskId: number, date: string | null) => {
      await window.api.scheduleTaskForDate(taskId, date)
      await refresh()
    },
    [refresh]
  )

  const createTimeBlock = useCallback(
    async (data: CreateTimeBlockInput): Promise<TimeBlock> => {
      const block = await window.api.createTimeBlock(data)
      await refresh()
      return block
    },
    [refresh]
  )

  const deleteTimeBlock = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTimeBlock(id)
      await refresh()
    },
    [refresh]
  )

  return {
    timeBlocks,
    scheduledTasks,
    loading,
    refresh,
    scheduleTask,
    createTimeBlock,
    deleteTimeBlock
  }
}
