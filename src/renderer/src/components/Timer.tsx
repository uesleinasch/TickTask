import { useEffect, useState, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
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

  // Determinar cor da barra de progresso
  let progressColor = 'bg-slate-900'
  if (progress > 80) progressColor = 'bg-yellow-500'
  if (progress >= 100) progressColor = 'bg-red-500'

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
    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-lg relative overflow-hidden">
      {/* Barra de progresso no topo quando rodando */}
      {isRunning && (
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse-slow" />
      )}

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center">
        <div
          className={cn(
            'text-7xl font-mono font-bold tracking-tighter mb-8 tabular-nums',
            isRunning ? 'text-slate-900' : 'text-slate-400',
            hasReachedLimit && 'text-red-500'
          )}
        >
          {formatTime(displaySeconds)}
        </div>

        {/* Progress Bar */}
        {timeLimit && timeLimit > 0 && (
          <div className="w-full max-w-md mb-8 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-500 ease-in-out ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-slate-400 mt-1">
              Meta: {formatTime(timeLimit)}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="h-14 px-8 rounded-full text-lg shadow-xl shadow-slate-200 bg-slate-900 text-white hover:bg-slate-800"
            >
              <Play className="fill-current mr-2" /> Iniciar
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              variant="outline"
              className="h-14 px-8 rounded-full text-lg border-2 border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
            >
              <Pause className="fill-current mr-2" /> Pausar
            </Button>
          )}

          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-14 w-14 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <RotateCcw size={20} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-900">Resetar Timer</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600">
                  Tem certeza que deseja resetar o timer? Todo o tempo registrado será zerado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-slate-200 text-slate-700 hover:bg-slate-100">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
