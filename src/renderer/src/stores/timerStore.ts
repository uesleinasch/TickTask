import { create } from 'zustand'
import type { Task, TimeEntry } from '@shared/types'

// Controle de notificações Time Leak, por task
const lastTimeLeakNotification: Record<number, number> = {}

export interface ActiveTimer {
  task: Task
  entry: TimeEntry
  displaySeconds: number
}

interface TimerState {
  timers: Record<number, ActiveTimer>
  intervalId: number | null

  // Internas
  tick: () => void
  startInterval: () => void
  stopInterval: () => void
  pushFloat: () => void

  // Ações
  startTimer: (taskId: number) => Promise<void>
  stopTimer: (taskId: number) => Promise<void>
  stopAllTimers: () => Promise<void>
  resetTimer: (taskId: number) => Promise<void>
  removeTimer: (taskId: number) => void
  syncWithDatabase: () => void
}

function computeSeconds(timer: ActiveTimer): number {
  const startTime = new Date(timer.entry.start_time).getTime()
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  return timer.task.total_seconds + elapsed
}

export const useTimerStore = create<TimerState>((set, get) => ({
  timers: {},
  intervalId: null,

  pushFloat: () => {
    const { timers } = get()
    const list = Object.values(timers).map((t) => ({
      taskId: t.task.id,
      taskName: t.task.name,
      seconds: t.displaySeconds
    }))
    if (list.length > 0) {
      window.api.updateFloatTimer(list)
    } else {
      window.api.clearFloatTimer().catch((err) => {
        console.error('[TimerStore] Erro em clearFloatTimer():', err)
      })
    }
  },

  tick: () => {
    const { timers } = get()
    const ids = Object.keys(timers)
    if (ids.length === 0) {
      get().stopInterval()
      return
    }

    const next: Record<number, ActiveTimer> = {}
    for (const key of ids) {
      const id = Number(key)
      const timer = timers[id]
      const seconds = computeSeconds(timer)
      next[id] = { ...timer, displaySeconds: seconds }

      // Time Leak: notificação a cada 5 minutos após 1 hora, por task
      if (timer.task.category === 'time_leak' && seconds >= 3600) {
        const currentMinute = Math.floor(seconds / 60)
        const lastNotifiedMinute = Math.floor((lastTimeLeakNotification[id] ?? 0) / 60)
        if (currentMinute % 5 === 0 && currentMinute !== lastNotifiedMinute) {
          lastTimeLeakNotification[id] = seconds
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          window.api.showNotification(
            '⚠️ Time Leak Alert!',
            `A tarefa "${timer.task.name}" já está em ${hours}h${minutes}min. Considere finalizá-la!`
          )
        }
      }
    }
    set({ timers: next })
    get().pushFloat()
  },

  startInterval: () => {
    const { intervalId } = get()
    if (intervalId !== null) return
    const id = window.setInterval(() => get().tick(), 1000)
    set({ intervalId: id })
  },

  stopInterval: () => {
    const { intervalId } = get()
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      set({ intervalId: null })
    }
  },

  startTimer: async (taskId) => {
    // Não para outros timers — modo sempre paralelo.
    await window.api.startTask(taskId)
    const task = await window.api.getTask(taskId)
    const entry = await window.api.getActiveTimeEntry(taskId)
    if (!task || !entry) return

    set((state) => ({
      timers: {
        ...state.timers,
        [taskId]: { task, entry, displaySeconds: task.total_seconds }
      }
    }))
    get().startInterval()
    get().pushFloat()
  },

  stopTimer: async (taskId) => {
    await window.api.stopTask(taskId)
    get().removeTimer(taskId)
  },

  stopAllTimers: async () => {
    const ids = Object.keys(get().timers).map(Number)
    for (const id of ids) {
      await window.api.stopTask(id)
    }
    get().stopInterval()
    set({ timers: {} })
    get().pushFloat()
  },

  resetTimer: async (taskId) => {
    await window.api.resetTask(taskId)
    get().removeTimer(taskId)
  },

  removeTimer: (taskId) => {
    delete lastTimeLeakNotification[taskId]
    set((state) => {
      const next = { ...state.timers }
      delete next[taskId]
      return { timers: next }
    })
    if (Object.keys(get().timers).length === 0) {
      get().stopInterval()
    }
    get().pushFloat()
  },

  syncWithDatabase: () => {
    window.api
      .listRunningTasks()
      .then(async (running) => {
        const next: Record<number, ActiveTimer> = {}
        for (const task of running) {
          const entry = await window.api.getActiveTimeEntry(task.id)
          if (entry) {
            next[task.id] = { task, entry, displaySeconds: task.total_seconds }
          }
        }
        set({ timers: next })
        if (Object.keys(next).length > 0) {
          get().startInterval()
          get().tick()
        } else {
          get().stopInterval()
        }
      })
      .catch((error) => {
        console.error('Erro ao sincronizar timers:', error)
      })
  }
}))

// Inicializar a store quando o app carrega
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useTimerStore.getState().syncWithDatabase()
  }, 100)
}
