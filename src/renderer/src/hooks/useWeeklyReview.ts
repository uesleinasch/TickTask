import { useState, useEffect, useCallback } from 'react'
import type { WeeklyReview, ReviewHealthIndicators } from '@shared/types'

interface UseWeeklyReviewReturn {
  currentReview: WeeklyReview | null
  reviews: WeeklyReview[]
  healthIndicators: ReviewHealthIndicators | null
  loading: boolean
  startReview: () => Promise<WeeklyReview>
  updateReview: (data: {
    inbox_cleared?: boolean
    notes?: string
    checklist_state?: string
    completed_at?: string
  }) => Promise<void>
  completeReview: (notes?: string) => Promise<void>
  refreshData: () => Promise<void>
}

export function useWeeklyReview(): UseWeeklyReviewReturn {
  const [currentReview, setCurrentReview] = useState<WeeklyReview | null>(null)
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [healthIndicators, setHealthIndicators] = useState<ReviewHealthIndicators | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [lastReview, allReviews, health] = await Promise.all([
        window.api.getLastWeeklyReview(),
        window.api.listWeeklyReviews(),
        window.api.getReviewHealthIndicators()
      ])

      // Se a última revisão não foi concluída, ela é a revisão atual
      if (lastReview && !lastReview.completed_at) {
        setCurrentReview(lastReview)
      } else {
        setCurrentReview(null)
      }

      setReviews(allReviews)
      setHealthIndicators(health)
    } catch (error) {
      console.error('Failed to load review data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const startReview = useCallback(async (): Promise<WeeklyReview> => {
    const review = await window.api.createWeeklyReview()
    setCurrentReview(review)
    await refreshData()
    return review
  }, [refreshData])

  const updateReview = useCallback(
    async (data: {
      inbox_cleared?: boolean
      notes?: string
      checklist_state?: string
      completed_at?: string
    }): Promise<void> => {
      if (!currentReview) return
      await window.api.updateWeeklyReview(currentReview.id, data)
      const updated = await window.api.getWeeklyReview(currentReview.id)
      if (updated) setCurrentReview(updated)
    },
    [currentReview]
  )

  const completeReview = useCallback(
    async (notes?: string): Promise<void> => {
      if (!currentReview) return
      await window.api.updateWeeklyReview(currentReview.id, {
        completed_at: new Date().toISOString(),
        notes
      })
      setCurrentReview(null)
      await refreshData()
    },
    [currentReview, refreshData]
  )

  return {
    currentReview,
    reviews,
    healthIndicators,
    loading,
    startReview,
    updateReview,
    completeReview,
    refreshData
  }
}
