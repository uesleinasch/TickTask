import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTime } from '@renderer/lib/utils'
import { Play } from 'lucide-react'
import type { Task, TimeEntry } from '../../../shared/types'

interface ActiveTaskData {
  task: Task
  activeEntry: TimeEntry | undefined
}

export function FloatingTimer(): React.JSX.Element | null {
  const navigate = useNavigate()
  const [activeData, setActiveData] = useState<ActiveTaskData | null>(null)
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const intervalRef = useRef<number | null>(null)

  // Calcular segundos em tempo real
  const calculateCurrentSeconds = useCallback((task: Task, activeEntry: TimeEntry | undefined): number => {
    if (!task.is_running || !activeEntry) {
      return task.total_seconds
    }
    
    // Calcular tempo decorrido desde o início da sessão ativa
    const startTime = new Date(activeEntry.start_time).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - startTime) / 1000)
    
    // Total = tempo já salvo + tempo da sessão atual
    return task.total_seconds + elapsedSeconds
  }, [])

  // Verificar se há task ativa
  useEffect(() => {
    const checkActiveTask = async (): Promise<void> => {
      try {
        const tasks = await window.api.listTasks(false)
        const running = tasks.find((t) => t.is_running)
        
        if (running) {
          const activeEntry = await window.api.getActiveTimeEntry(running.id)
          setActiveData({ task: running, activeEntry })
          setDisplaySeconds(calculateCurrentSeconds(running, activeEntry))
        } else {
          setActiveData(null)
        }
      } catch (error) {
        console.error('Erro ao verificar task ativa:', error)
      }
    }

    checkActiveTask()
    // Verificar a cada 3 segundos para pegar novas tasks
    const checkInterval = window.setInterval(checkActiveTask, 3000)

    return () => window.clearInterval(checkInterval)
  }, [calculateCurrentSeconds])

  // Incrementar contador quando há task ativa
  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (activeData?.task.is_running && activeData.activeEntry) {
      // Atualizar display a cada segundo com cálculo real
      intervalRef.current = window.setInterval(() => {
        setDisplaySeconds(calculateCurrentSeconds(activeData.task, activeData.activeEntry))
      }, 1000)
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [activeData, calculateCurrentSeconds])

  // Não mostrar se não há task ativa
  if (!activeData) {
    return null
  }

  const handleClick = (): void => {
    navigate(`/task/${activeData.task.id}`)
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
        <span className="text-xs opacity-80 truncate max-w-32">{activeData.task.name}</span>
        <span className="text-lg font-mono font-bold tabular-nums">{formatTime(displaySeconds)}</span>
      </div>
    </button>
  )
}
