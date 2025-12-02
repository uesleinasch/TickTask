import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { formatTime } from '@renderer/lib/utils'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { useNotification } from '@renderer/hooks/useNotification'
import { cn } from '@renderer/lib/utils'

interface TimerProps {
  taskId: number
  initialSeconds: number
  timeLimit?: number
  isRunning: boolean
  taskName: string
  onStateChange?: () => void
}

export function Timer({
  taskId,
  initialSeconds,
  timeLimit,
  isRunning: propIsRunning,
  taskName,
  onStateChange
}: TimerProps): React.JSX.Element {
  const { notify } = useNotification()
  
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(propIsRunning)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)
  const taskIdRef = useRef(taskId)

  // Calcular progresso
  const progress = timeLimit ? Math.min((seconds / timeLimit) * 100, 100) : 0

  // Verificar limite de tempo
  useEffect(() => {
    if (timeLimit && seconds >= timeLimit && !notifiedRef.current) {
      setHasReachedLimit(true)
      notifiedRef.current = true
      notify('Tempo Limite!', `A tarefa "${taskName}" atingiu o limite de tempo`)
    }
  }, [seconds, timeLimit, taskName, notify])

  // Gerenciar intervalo do timer - LÓGICA PRINCIPAL
  useEffect(() => {
    console.log('[Timer Effect] isRunning:', isRunning)
    
    // Sempre limpar o intervalo anterior primeiro
    if (intervalRef.current !== null) {
      console.log('[Timer Effect] Limpando intervalo anterior:', intervalRef.current)
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isRunning) {
      console.log('[Timer Effect] Criando novo intervalo...')
      intervalRef.current = window.setInterval(() => {
        setSeconds(prev => {
          const newValue = prev + 1
          console.log('[Timer Tick]', newValue)
          return newValue
        })
      }, 1000)
      console.log('[Timer Effect] Intervalo criado:', intervalRef.current)
    }

    return () => {
      if (intervalRef.current !== null) {
        console.log('[Timer Cleanup] Limpando intervalo:', intervalRef.current)
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  // Sincronizar apenas quando mudar de tarefa
  useEffect(() => {
    if (taskIdRef.current !== taskId) {
      console.log('[Timer] Mudou de tarefa, resetando estado')
      setSeconds(initialSeconds)
      setIsRunning(propIsRunning)
      setHasReachedLimit(false)
      notifiedRef.current = false
      taskIdRef.current = taskId
    }
  }, [taskId, initialSeconds, propIsRunning])

  const handleStart = useCallback(async () => {
    console.log('[Timer] handleStart chamado')
    try {
      await window.api.startTask(taskId)
      console.log('[Timer] API startTask OK, setIsRunning(true)')
      setIsRunning(true)
    } catch (error) {
      console.error('[Timer] Erro ao iniciar:', error)
    }
  }, [taskId])

  const handlePause = useCallback(async () => {
    console.log('[Timer] handlePause chamado, seconds:', seconds)
    try {
      setIsRunning(false)
      await window.api.stopTask(taskId)
      console.log('[Timer] API stopTask OK')
      onStateChange?.()
    } catch (error) {
      console.error('[Timer] Erro ao pausar:', error)
    }
  }, [taskId, seconds, onStateChange])

  const handleReset = useCallback(async () => {
    console.log('[Timer] handleReset chamado')
    try {
      setIsRunning(false)
      setSeconds(0)
      setHasReachedLimit(false)
      notifiedRef.current = false
      await window.api.resetTask(taskId)
      console.log('[Timer] API resetTask OK')
      onStateChange?.()
    } catch (error) {
      console.error('[Timer] Erro ao resetar:', error)
    }
  }, [taskId, onStateChange])

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-card rounded-xl border">
      {/* Timer Display */}
      <div
        className={cn(
          'text-6xl font-mono font-bold tabular-nums text-foreground',
          hasReachedLimit && 'text-destructive'
        )}
      >
        {formatTime(seconds)}
      </div>

      {/* Progress Bar */}
      {timeLimit && timeLimit > 0 && (
        <div className="w-full space-y-2">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(progress)}% de {formatTime(timeLimit)}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {isRunning ? (
          <Button onClick={handlePause} size="lg" variant="secondary">
            <Pause className="mr-2 h-5 w-5" />
            Pausar
          </Button>
        ) : (
          <Button onClick={handleStart} size="lg">
            <Play className="mr-2 h-5 w-5" />
            Iniciar
          </Button>
        )}
        <Button onClick={handleReset} size="lg" variant="outline">
          <RotateCcw className="mr-2 h-5 w-5" />
          Resetar
        </Button>
      </div>
    </div>
  )
}
