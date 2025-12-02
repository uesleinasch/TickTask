import { create } from 'zustand'
import type { Task, TimeEntry } from '../../../shared/types'

interface ActiveTimerState {
  // Estado do timer ativo
  activeTask: Task | null
  activeEntry: TimeEntry | null
  displaySeconds: number
  isRunning: boolean

  // Referência para o intervalo
  intervalId: number | null

  // Ações
  setActiveTimer: (task: Task, entry: TimeEntry) => void
  clearActiveTimer: () => void
  updateDisplaySeconds: (seconds: number) => void
  tick: () => void
  startInterval: () => void
  stopInterval: () => void

  // Ações de timer
  startTimer: (taskId: number) => Promise<void>
  pauseTimer: (taskId: number) => Promise<void>
  resetTimer: (taskId: number) => Promise<void>

  // Sincronização
  syncWithDatabase: (task?: Task, entry?: TimeEntry | null) => void
}

export const useTimerStore = create<ActiveTimerState>((set, get) => ({
  activeTask: null,
  activeEntry: null,
  displaySeconds: 0,
  isRunning: false,
  intervalId: null,

  setActiveTimer: (task, entry) => {
    const startTime = new Date(entry.start_time).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalSeconds = task.total_seconds + elapsed

    set({
      activeTask: task,
      activeEntry: entry,
      displaySeconds: totalSeconds,
      isRunning: true
    })

    // Iniciar o intervalo
    get().startInterval()
  },

  clearActiveTimer: () => {
    get().stopInterval()
    set({
      activeTask: null,
      activeEntry: null,
      displaySeconds: 0,
      isRunning: false
    })
  },

  updateDisplaySeconds: (seconds) => {
    set({ displaySeconds: seconds })
  },

  tick: () => {
    const { activeTask, activeEntry } = get()
    if (activeTask && activeEntry) {
      const startTime = new Date(activeEntry.start_time).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      set({ displaySeconds: activeTask.total_seconds + elapsed })
    }
  },

  startInterval: () => {
    const { intervalId } = get()
    if (intervalId !== null) {
      window.clearInterval(intervalId)
    }

    const id = window.setInterval(() => {
      get().tick()
    }, 1000)

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
    await window.api.startTask(taskId)

    // Buscar dados atualizados
    const task = await window.api.getTask(taskId)
    const entry = await window.api.getActiveTimeEntry(taskId)

    if (task && entry) {
      get().setActiveTimer(task, entry)
    }
  },

  pauseTimer: async (taskId) => {
    get().stopInterval()
    await window.api.stopTask(taskId)

    // Atualizar estado
    const task = await window.api.getTask(taskId)
    if (task) {
      set({
        activeTask: task,
        activeEntry: null,
        displaySeconds: task.total_seconds,
        isRunning: false
      })
    }
  },

  resetTimer: async (taskId) => {
    get().stopInterval()
    await window.api.resetTask(taskId)

    set({
      activeTask: null,
      activeEntry: null,
      displaySeconds: 0,
      isRunning: false
    })
  },

  syncWithDatabase: (task?: Task, entry?: TimeEntry | null) => {
    // Se recebeu task e entry, sincroniza diretamente
    if (task && task.is_running && entry) {
      get().setActiveTimer(task, entry)
      return
    }
    
    // Se recebeu task mas não está rodando, limpa
    if (task && !task.is_running) {
      set({
        activeTask: task,
        activeEntry: null,
        displaySeconds: task.total_seconds,
        isRunning: false
      })
      return
    }

    // Sem parâmetros, busca do banco
    window.api.listTasks(false).then((tasks) => {
      const runningTask = tasks.find((t) => t.is_running)

      if (runningTask) {
        window.api.getActiveTimeEntry(runningTask.id).then((activeEntry) => {
          if (activeEntry) {
            get().setActiveTimer(runningTask, activeEntry)
          }
        })
      } else {
        get().clearActiveTimer()
      }
    }).catch((error) => {
      console.error('Erro ao sincronizar timer:', error)
    })
  }
}))

// Inicializar a store quando o app carrega
if (typeof window !== 'undefined') {
  // Aguardar um pouco para garantir que a API está disponível
  setTimeout(() => {
    useTimerStore.getState().syncWithDatabase()
  }, 100)
}
