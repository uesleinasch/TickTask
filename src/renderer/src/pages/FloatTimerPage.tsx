import { useState, useEffect, useCallback } from 'react'
import { Activity, Square, Maximize2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { formatTime } from '@renderer/lib/utils'

interface TimerData {
  taskId: number
  taskName: string
  seconds: number
}

export function FloatTimerPage(): React.JSX.Element {
  const [timerData, setTimerData] = useState<TimerData | null>(null)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    // Escutar atualizações do timer principal
    const unsubscribe = window.api.onFloatUpdate((data) => {
      setTimerData(data)
      setSeconds(data.seconds)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Incrementar o contador localmente
  useEffect(() => {
    if (!timerData) return

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerData])

  const handleRestore = useCallback(() => {
    window.api.restoreFromFloat()
  }, [])

  const handleStop = useCallback(async () => {
    if (timerData) {
      await window.api.stopFromFloat(timerData.taskId)
    }
  }, [timerData])

  if (!timerData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/95 rounded-xl">
        <p className="text-slate-400 text-sm">Aguardando...</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex items-center gap-3 px-4 bg-slate-900/95 backdrop-blur rounded-xl border border-slate-700 shadow-2xl cursor-move"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Indicador de atividade */}
      <div className="relative">
        <Activity size={20} className="text-emerald-400" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      </div>

      {/* Info da tarefa */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-mono text-lg font-bold tracking-wider">
          {formatTime(seconds)}
        </p>
        <p className="text-slate-400 text-xs truncate">{timerData.taskName}</p>
      </div>

      {/* Botões */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStop}
          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          title="Parar"
        >
          <Square size={14} fill="currentColor" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRestore}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
          title="Restaurar"
        >
          <Maximize2 size={14} />
        </Button>
      </div>
    </div>
  )
}
