import { useState, useEffect, useCallback } from 'react'
import type { Area, Goal, CreateAreaInput, UpdateAreaInput, CreateGoalInput, UpdateGoalInput } from '@shared/types'

// ===================== AREAS =====================

interface UseAreasReturn {
  areas: Area[]
  loading: boolean
  refreshAreas: () => Promise<void>
  createArea: (data: CreateAreaInput) => Promise<Area>
  updateArea: (id: number, data: UpdateAreaInput) => Promise<void>
  deleteArea: (id: number) => Promise<void>
}

export function useAreas(): UseAreasReturn {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  const refreshAreas = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.listAreas()
      setAreas(result)
    } catch (error) {
      console.error('Failed to load areas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAreas()
  }, [refreshAreas])

  const createArea = useCallback(
    async (data: CreateAreaInput): Promise<Area> => {
      const area = await window.api.createArea(data)
      await refreshAreas()
      return area
    },
    [refreshAreas]
  )

  const updateArea = useCallback(
    async (id: number, data: UpdateAreaInput): Promise<void> => {
      await window.api.updateArea(id, data)
      await refreshAreas()
    },
    [refreshAreas]
  )

  const deleteArea = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteArea(id)
      await refreshAreas()
    },
    [refreshAreas]
  )

  return { areas, loading, refreshAreas, createArea, updateArea, deleteArea }
}

// ===================== GOALS =====================

interface UseGoalsReturn {
  goals: Goal[]
  loading: boolean
  refreshGoals: () => Promise<void>
  createGoal: (data: CreateGoalInput) => Promise<Goal>
  updateGoal: (id: number, data: UpdateGoalInput) => Promise<void>
  deleteGoal: (id: number) => Promise<void>
}

export function useGoals(areaId?: number): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const refreshGoals = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.listGoals(areaId)
      setGoals(result)
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setLoading(false)
    }
  }, [areaId])

  useEffect(() => {
    refreshGoals()
  }, [refreshGoals])

  const createGoal = useCallback(
    async (data: CreateGoalInput): Promise<Goal> => {
      const goal = await window.api.createGoal(data)
      await refreshGoals()
      return goal
    },
    [refreshGoals]
  )

  const updateGoal = useCallback(
    async (id: number, data: UpdateGoalInput): Promise<void> => {
      await window.api.updateGoal(id, data)
      await refreshGoals()
    },
    [refreshGoals]
  )

  const deleteGoal = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteGoal(id)
      await refreshGoals()
    },
    [refreshGoals]
  )

  return { goals, loading, refreshGoals, createGoal, updateGoal, deleteGoal }
}
