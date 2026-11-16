import type { Task } from '@shared/types'

export type LiveSecondsMap = Record<number, { displaySeconds: number } | undefined>

export function liveSeconds(
  task: Pick<Task, 'id' | 'total_seconds'>,
  timers: LiveSecondsMap
): number {
  return timers[task.id]?.displaySeconds ?? task.total_seconds
}
