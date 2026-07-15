import { useState, useEffect, useCallback } from 'react'
import { Activity, Square, Maximize2, StopCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { formatTime } from '@renderer/lib/utils'

interface TimerRow {
  taskId: number
  taskName: string
  seconds: number
}

export function FloatTimerPage(): React.JSX.Element {
  const [timers, setTimers] = useState<TimerRow[]>([])

  // Adiciona classe ao body para background transparente
  useEffect(() => {
    document.body.classList.add('float-window')
    return () => {
      document.body.classList.remove('float-window')
    }
  }, [])

  useEffect(() => {
    const unsubscribeUpdate = window.api.onFloatUpdate((data) => {
      setTimers(data)
    })
    const unsubscribeClear = window.api.onFloatClear(() => {
      setTimers([])
    })
    return () => {
      unsubscribeUpdate()
      unsubscribeClear()
    }
  }, [])

  const handleRestore = useCallback(() => {
    window.api.restoreFromFloat()
  }, [])

  const handleStop = useCallback((taskId: number) => {
    window.api.stopFromFloat(taskId)
  }, [])

  const handleStopAll = useCallback(() => {
    window.api.stopAllFromFloat()
  }, [])

  if (timers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/95 rounded-xl">
        <p className="text-slate-400 text-sm">Aguardando...</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-900/95 backdrop-blur rounded-xl border border-slate-700 shadow-2xl select-none overflow-hidden"
      style={{ WebkitAppRegion: 'drag', cursor: 'grab' } as React.CSSProperties}
    >
      {/* Lista de timers (scroll acima de 5) */}
      <div className="flex-1 overflow-y-auto">
        {timers.map((t) => (
          <div
            key={t.taskId}
            className="flex items-center gap-2 px-3 h-11 border-b border-slate-800 last:border-b-0"
          >
            <div className="relative shrink-0">
              <Activity size={16} className="text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <span className="text-slate-300 text-xs truncate flex-1 min-w-0">{t.taskName}</span>
            <span className="text-white font-mono text-sm font-bold tabular-nums">
              {formatTime(t.seconds)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStop(t.taskId)}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
              title="Parar"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <Square size={12} fill="currentColor" />
            </Button>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div
        className="flex items-center justify-between gap-2 px-3 h-11 border-t border-slate-700 bg-slate-900"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <span className="text-slate-400 text-xs">
          {timers.length} {timers.length === 1 ? 'ativo' : 'ativos'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopAll}
            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-1"
            title="Parar todos"
          >
            <StopCircle size={14} /> <span className="text-xs">Parar todos</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestore}
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
            title="Abrir app"
          >
            <Maximize2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
