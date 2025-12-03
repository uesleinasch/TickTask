import { create } from 'zustand'
import type { Task, TimeEntry } from '@shared/types'

// Controle de notificações Time Leak
let lastTimeLeakNotification = 0

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
    console.log('[TimerStore] setActiveTimer() para tarefa:', task.id, task.name)
    
    // Primeiro limpar qualquer interval existente
    const { intervalId } = get()
    if (intervalId !== null) {
      console.log('[TimerStore] Limpando interval anterior:', intervalId)
      window.clearInterval(intervalId)
    }

    const startTime = new Date(entry.start_time).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const totalSeconds = task.total_seconds + elapsed

    // Atualizar estado de forma atômica
    set({
      activeTask: task,
      activeEntry: entry,
      displaySeconds: totalSeconds,
      isRunning: true,
      intervalId: null // Será definido pelo startInterval
    })

    // Atualizar a janela flutuante
    window.api.updateFloatTimer({
      taskId: task.id,
      taskName: task.name,
      seconds: totalSeconds
    })

    // Iniciar o novo intervalo
    get().startInterval()
  },

  clearActiveTimer: () => {
    console.log('[TimerStore] clearActiveTimer() - Limpando estado completamente')
    
    // Primeiro parar o interval
    const { intervalId } = get()
    if (intervalId !== null) {
      console.log('[TimerStore] Parando interval:', intervalId)
      window.clearInterval(intervalId)
    }

    // Limpar a janela flutuante - CRÍTICO!
    console.log('[TimerStore] Chamando window.api.clearFloatTimer()')
    window.api
      .clearFloatTimer()
      .then(() => {
        console.log('[TimerStore] clearFloatTimer() completado')
      })
      .catch((err) => {
        console.error('[TimerStore] Erro em clearFloatTimer():', err)
      })

    // Resetar TODO o estado para valores iniciais
    set({
      activeTask: null,
      activeEntry: null,
      displaySeconds: 0,
      isRunning: false,
      intervalId: null
    })

    console.log('[TimerStore] Estado resetado para valores iniciais')
  },

  updateDisplaySeconds: (seconds) => {
    set({ displaySeconds: seconds })
  },

  tick: () => {
    const { activeTask, activeEntry, isRunning } = get()
    // Verificar se ainda está rodando e se há dados válidos
    if (!isRunning || !activeTask || !activeEntry) {
      return
    }

    const startTime = new Date(activeEntry.start_time).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const newSeconds = activeTask.total_seconds + elapsed
    set({ displaySeconds: newSeconds })

    // Atualizar a janela flutuante
    window.api.updateFloatTimer({
      taskId: activeTask.id,
      taskName: activeTask.name,
      seconds: newSeconds
    })

    // Time Leak: notificação a cada 5 minutos após 1 hora
    if (activeTask.category === 'time_leak' && newSeconds >= 3600) {
      const currentMinute = Math.floor(newSeconds / 60)
      const lastNotifiedMinute = Math.floor(lastTimeLeakNotification / 60)

      // Notificar a cada 5 minutos (60, 65, 70, 75, ...)
      if (currentMinute >= 60 && currentMinute % 5 === 0 && currentMinute !== lastNotifiedMinute) {
        lastTimeLeakNotification = newSeconds
        const hours = Math.floor(newSeconds / 3600)
        const minutes = Math.floor((newSeconds % 3600) / 60)
        window.api.showNotification(
          '⚠️ Time Leak Alert!',
          `A tarefa "${activeTask.name}" já está em ${hours}h${minutes}min. Considere finalizá-la!`
        )
      }
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
    console.log('[TimerStore] startTimer() chamado para taskId:', taskId)
    
    // IMPORTANTE: Limpar COMPLETAMENTE qualquer estado anterior
    // Isso garante que não haverá flicker ou conflitos
    const { activeTask, isRunning, intervalId } = get()
    
    if (activeTask || isRunning || intervalId !== null) {
      console.log('[TimerStore] Limpando estado anterior antes de iniciar nova tarefa')
      
      // Se há uma tarefa diferente rodando, parar no banco também
      if (activeTask && activeTask.id !== taskId && isRunning) {
        console.log('[TimerStore] Pausando tarefa anterior:', activeTask.id)
        await window.api.stopTask(activeTask.id)
      }
      
      // Limpar interval e estado
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
      
      // Resetar estado
      set({
        activeTask: null,
        activeEntry: null,
        displaySeconds: 0,
        isRunning: false,
        intervalId: null
      })
    }

    // Agora iniciar a nova tarefa
    await window.api.startTask(taskId)

    // Buscar dados atualizados
    const task = await window.api.getTask(taskId)
    const entry = await window.api.getActiveTimeEntry(taskId)

    if (task && entry) {
      console.log('[TimerStore] Iniciando timer para tarefa:', task.name)
      get().setActiveTimer(task, entry)
    }
  },

  pauseTimer: async (taskId) => {
    console.log('[TimerStore] pauseTimer() chamado para taskId:', taskId)
    
    // Primeiro, salvar os dados atuais no banco
    await window.api.stopTask(taskId)
    
    // Depois, limpar COMPLETAMENTE o estado da store e do float
    get().clearActiveTimer()
    
    console.log('[TimerStore] pauseTimer() - Estado limpo completamente')
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
    const { activeTask: currentActiveTask, isRunning: currentIsRunning } = get()
    
    // Se recebeu task e entry, sincroniza diretamente
    if (task && task.is_running && entry) {
      // IMPORTANTE: Evitar reiniciar se já é a mesma tarefa rodando
      if (currentActiveTask?.id === task.id && currentIsRunning) {
        // Já está rodando a mesma tarefa, não fazer nada
        return
      }
      get().setActiveTimer(task, entry)
      return
    }

    // Se recebeu task mas não está rodando, apenas limpa o estado local
    if (task && !task.is_running) {
      // Parar interval se estava rodando
      get().stopInterval()
      // NÃO chamar clearFloatTimer aqui - deixar o main process decidir
      set({
        activeTask: null,
        activeEntry: null,
        displaySeconds: task.total_seconds,
        isRunning: false
      })
      return
    }

    // Sem parâmetros, busca do banco
    window.api
      .listTasks(false)
      .then((tasks) => {
        const runningTask = tasks.find((t) => t.is_running)

        if (runningTask) {
          // Verificar se já é a mesma tarefa
          if (currentActiveTask?.id === runningTask.id && currentIsRunning) {
            return // Já está rodando, não precisa resincronizar
          }
          
          window.api.getActiveTimeEntry(runningTask.id).then((activeEntry) => {
            if (activeEntry) {
              get().setActiveTimer(runningTask, activeEntry)
            }
          })
        } else {
          // Apenas limpar estado local, não destruir o float
          // (pode não haver float criado ainda na inicialização)
          const { intervalId } = get()
          if (intervalId !== null) {
            window.clearInterval(intervalId)
          }
          set({
            activeTask: null,
            activeEntry: null,
            displaySeconds: 0,
            isRunning: false,
            intervalId: null
          })
        }
      })
      .catch((error) => {
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
