import { useEffect, useState, useCallback } from 'react'
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
import { useTimerStore } from '@renderer/stores/timerStore'
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const notifiedRef = { current: false }

  // Usar a store global
  const {
    activeTask,
    displaySeconds: storeSeconds,
    isRunning: storeIsRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    syncWithDatabase
  } = useTimerStore()

  // Determinar se este timer é o ativo
  const isThisTaskActive = activeTask?.id === taskId
  const displaySeconds = isThisTaskActive ? storeSeconds : initialSeconds
  const isRunning = isThisTaskActive ? storeIsRunning : false

  // Calcular progresso
  const progress = timeLimit ? Math.min((displaySeconds / timeLimit) * 100, 100) : 0

  // Sincronizar com a store quando o componente monta
  useEffect(() => {
    if (propIsRunning) {
      syncWithDatabase()
    }
  }, [propIsRunning, syncWithDatabase])

  // Verificar limite de tempo
  useEffect(() => {
    if (timeLimit && displaySeconds >= timeLimit && !notifiedRef.current) {
      setHasReachedLimit(true)
      notifiedRef.current = true
      notify('Tempo Limite!', `A tarefa "${taskName}" atingiu o limite de tempo`)
    }
  }, [displaySeconds, timeLimit, taskName, notify])

  const handleStart = useCallback(async () => {
    try {
      await startTimer(taskId)
    } catch (error) {
      console.error('[Timer] Erro ao iniciar:', error)
    }
  }, [taskId, startTimer])

  const handlePause = useCallback(async () => {
    try {
      await pauseTimer(taskId)
      onStateChange?.()
    } catch (error) {
      console.error('[Timer] Erro ao pausar:', error)
    }
  }, [taskId, pauseTimer, onStateChange])

  const handleReset = useCallback(async () => {
    try {
      await resetTimer(taskId)
      setHasReachedLimit(false)
      notifiedRef.current = false
      onStateChange?.()
    } catch (error) {
      console.error('[Timer] Erro ao resetar:', error)
    }
  }, [taskId, resetTimer, onStateChange])

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
