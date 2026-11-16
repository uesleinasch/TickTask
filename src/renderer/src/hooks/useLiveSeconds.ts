import type { Task } from '@shared/types'
import { useTimerStore } from '@renderer/stores/timerStore'

export function useLiveSeconds(task: Pick<Task, 'id' | 'total_seconds'>): number {
  const running = useTimerStore((s) => s.timers[task.id]?.displaySeconds)
  return running ?? task.total_seconds
}
