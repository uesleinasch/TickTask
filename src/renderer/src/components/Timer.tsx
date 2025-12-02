import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
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

  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(propIsRunning)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)
  const baseSecondsRef = useRef(initialSeconds)

  // Calcular progresso
  const progress = timeLimit ? Math.min((displaySeconds / timeLimit) * 100, 100) : 0

  // Verificar limite de tempo
  useEffect(() => {
    if (timeLimit && displaySeconds >= timeLimit && !notifiedRef.current) {
      setHasReachedLimit(true)
      notifiedRef.current = true
      notify('Tempo Limite!', `A tarefa "${taskName}" atingiu o limite de tempo`)
    }
  }, [displaySeconds, timeLimit, taskName, notify])

  // Buscar tempo real e iniciar contador quando o componente monta
  useEffect(() => {
    const initTimer = async (): Promise<void> => {
      // Limpar intervalo anterior
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (propIsRunning) {
        try {
          const activeEntry = await window.api.getActiveTimeEntry(taskId)
          if (activeEntry) {
            const startTime = new Date(activeEntry.start_time).getTime()
            startTimeRef.current = startTime
            baseSecondsRef.current = initialSeconds

            // Calcular tempo atual imediatamente
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const currentSeconds = initialSeconds + elapsed
            setDisplaySeconds(currentSeconds)
            setIsRunning(true)

            // Iniciar intervalo para atualizar a cada segundo
            intervalRef.current = window.setInterval(() => {
              const nowInInterval = Date.now()
              const elapsedInInterval = Math.floor((nowInInterval - startTime) / 1000)
              setDisplaySeconds(initialSeconds + elapsedInInterval)
            }, 1000)
          }
        } catch (error) {
          console.error('Erro ao buscar tempo real:', error)
        }
      } else {
        setDisplaySeconds(initialSeconds)
        setIsRunning(false)
        startTimeRef.current = null
      }
    }

    initTimer()

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [taskId, propIsRunning, initialSeconds])

  const handleStart = useCallback(async () => {
    try {
      await window.api.startTask(taskId)
      // Definir o momento de início
      const now = Date.now()
      startTimeRef.current = now
      baseSecondsRef.current = displaySeconds
      setIsRunning(true)

      // Iniciar intervalo
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }
      intervalRef.current = window.setInterval(() => {
        const nowInInterval = Date.now()
        const elapsed = Math.floor((nowInInterval - now) / 1000)
        setDisplaySeconds(baseSecondsRef.current + elapsed)
      }, 1000)
    } catch (error) {
      console.error('[Timer] Erro ao iniciar:', error)
    }
  }, [taskId, displaySeconds])

  const handlePause = useCallback(async () => {
    try {
      // Parar intervalo primeiro
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsRunning(false)
      await window.api.stopTask(taskId)
      startTimeRef.current = null
      onStateChange?.()
    } catch (error) {
      console.error('[Timer] Erro ao pausar:', error)
    }
  }, [taskId, onStateChange])

  const handleReset = useCallback(async () => {
    try {
      // Parar intervalo primeiro
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsRunning(false)
      setDisplaySeconds(0)
      setHasReachedLimit(false)
      notifiedRef.current = false
      baseSecondsRef.current = 0
      startTimeRef.current = null
      await window.api.resetTask(taskId)
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
        {formatTime(displaySeconds)}
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

        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button size="lg" variant="secondary" className="text-foreground">
              <RotateCcw className="mr-2 h-5 w-5" />
              Resetar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar Timer</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja resetar o timer? Todo o tempo registrado será zerado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
