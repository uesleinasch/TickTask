import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { formatTime } from '@renderer/lib/utils'
import { Play } from 'lucide-react'
import { useTimerStore } from '@renderer/stores/timerStore'

export function FloatingTimer(): React.JSX.Element | null {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTask, displaySeconds, isRunning, syncWithDatabase, startInterval, stopInterval } = useTimerStore()

  // Verificar se há task ativa no banco (para quando voltar de outra página)
  useEffect(() => {
    const checkActiveTask = async (): Promise<void> => {
      try {
        const tasks = await window.api.listTasks(false)
        const running = tasks.find((t) => t.is_running)
        
        if (running) {
          const activeEntry = await window.api.getActiveTimeEntry(running.id)
          syncWithDatabase(running, activeEntry)
          
          // Iniciar interval se estiver rodando
          if (running.is_running && activeEntry) {
            startInterval()
          }
        }
      } catch (error) {
        console.error('Erro ao verificar task ativa:', error)
      }
    }

    // Verificar imediatamente
    checkActiveTask()
    
    // Verificar a cada 5 segundos para pegar mudanças
    const checkInterval = window.setInterval(checkActiveTask, 5000)

    return () => window.clearInterval(checkInterval)
  }, [syncWithDatabase, startInterval])

  // Gerenciar interval quando isRunning muda
  useEffect(() => {
    if (isRunning) {
      startInterval()
    } else {
      stopInterval()
    }

    return () => stopInterval()
  }, [isRunning, startInterval, stopInterval])

  // Não mostrar se não há task ativa ou se estamos na página da task ativa
  if (!activeTask || !isRunning) {
    return null
  }

  // Não mostrar se estamos na página desta task
  const isOnTaskPage = location.pathname === `/task/${activeTask.id}`
  if (isOnTaskPage) {
    return null
  }

  const handleClick = (): void => {
    navigate(`/task/${activeTask.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer z-50"
    >
      <div className="flex items-center justify-center w-8 h-8 bg-primary-foreground/20 rounded-full animate-pulse">
        <Play className="h-4 w-4 fill-current" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs opacity-80 truncate max-w-32">{activeTask.name}</span>
        <span className="text-lg font-mono font-bold tabular-nums">{formatTime(displaySeconds)}</span>
      </div>
    </button>
  )
}
