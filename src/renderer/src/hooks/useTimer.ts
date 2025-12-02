import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTimerProps {
  taskId: number
  taskName: string
  initialSeconds: number
  timeLimit?: number
  initialIsRunning: boolean
  onTimeLimitReached?: () => void
}

interface UseTimerReturn {
  seconds: number
  isRunning: boolean
  progress: number
  hasReachedLimit: boolean
  start: () => Promise<void>
  pause: () => Promise<void>
  reset: () => Promise<void>
}

export function useTimer({
  taskId,
  taskName,
  initialSeconds,
  timeLimit,
  initialIsRunning,
  onTimeLimitReached
}: UseTimerProps): UseTimerReturn {
  const [seconds, setSeconds] = useState(() => initialSeconds)
  const [isRunning, setIsRunning] = useState(() => initialIsRunning)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)
  const mountedTaskIdRef = useRef(taskId)

  // Calcular progresso
  const progress = timeLimit ? Math.min((seconds / timeLimit) * 100, 100) : 0

  // Verificar limite de tempo
  useEffect(() => {
    if (timeLimit && seconds >= timeLimit && !notifiedRef.current) {
      setHasReachedLimit(true)
      notifiedRef.current = true
      onTimeLimitReached?.()
    }
  }, [seconds, timeLimit, onTimeLimitReached])

  // Atualizar a janela flutuante quando o timer está rodando
  useEffect(() => {
    if (isRunning) {
      window.api.updateFloatTimer({ taskId, taskName, seconds })
    }
  }, [isRunning, taskId, taskName, seconds])

  // Limpar a janela flutuante quando o timer para
  useEffect(() => {
    if (!isRunning) {
      window.api.clearFloatTimer()
    }
  }, [isRunning])

  // Gerenciar intervalo do timer
  useEffect(() => {
    // Limpar intervalo anterior
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isRunning) {
      console.log('[Timer] Iniciando intervalo...')
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          console.log('[Timer] Tick:', prev + 1)
          return prev + 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current !== null) {
        console.log('[Timer] Limpando intervalo')
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  // Sincronizar APENAS quando a taskId muda (trocou de tarefa)
  useEffect(() => {
    if (mountedTaskIdRef.current !== taskId) {
      console.log('[Timer] TaskId mudou de', mountedTaskIdRef.current, 'para', taskId)
      setSeconds(initialSeconds)
      setIsRunning(initialIsRunning)
      setHasReachedLimit(false)
      notifiedRef.current = false
      mountedTaskIdRef.current = taskId
    }
  }, [taskId, initialSeconds, initialIsRunning])

  const start = useCallback(async () => {
    console.log('[Timer] start() chamado')
    try {
      await window.api.startTask(taskId)
      console.log('[Timer] API startTask sucesso, setIsRunning(true)')
      setIsRunning(true)
    } catch (error) {
      console.error('[Timer] Erro ao iniciar:', error)
    }
  }, [taskId])

  const pause = useCallback(async () => {
    console.log('[Timer] pause() chamado, seconds:', seconds)
    try {
      setIsRunning(false)
      await window.api.stopTask(taskId)
      console.log('[Timer] API stopTask sucesso')
    } catch (error) {
      console.error('[Timer] Erro ao pausar:', error)
    }
  }, [taskId, seconds])

  const reset = useCallback(async () => {
    console.log('[Timer] reset() chamado')
    try {
      setIsRunning(false)
      setSeconds(0)
      setHasReachedLimit(false)
      notifiedRef.current = false
      await window.api.resetTask(taskId)
      console.log('[Timer] API resetTask sucesso')
    } catch (error) {
      console.error('[Timer] Erro ao resetar:', error)
    }
  }, [taskId])

  return {
    seconds,
    isRunning,
    progress,
    hasReachedLimit,
    start,
    pause,
    reset
  }
}
