import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTime } from '@renderer/lib/utils'
import { Activity, Maximize2 } from 'lucide-react'
import { useTimerStore } from '@renderer/stores/timerStore'

export function FloatingTimer(): React.JSX.Element | null {
  const navigate = useNavigate()
  const { timers, syncWithDatabase } = useTimerStore()

  useEffect(() => {
    syncWithDatabase()
  }, [syncWithDatabase])

  const active = Object.values(timers)
  if (active.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-10 fade-in duration-300">
      {active.map((t) => (
        <button
          key={t.task.id}
          onClick={() => navigate(`/task/${t.task.id}`)}
          className="group flex items-center gap-3 bg-slate-900 text-white pl-4 pr-5 py-2.5 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 border border-slate-700 cursor-pointer"
        >
          {/* Ícone Animado */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-emerald-500 rounded-full p-1.5">
              <Activity size={14} className="text-white" />
            </div>
          </div>

          {/* Info + Timer */}
          <div className="flex flex-col items-start min-w-[80px] max-w-[160px]">
            <span className="text-[10px] text-slate-400 truncate w-full text-left">
              {t.task.name}
            </span>
            <span className="font-mono font-bold text-base leading-none tabular-nums">
              {formatTime(t.displaySeconds)}
            </span>
          </div>

          {/* Expand Icon */}
          <div className="border-l border-slate-700 pl-3 ml-1 text-slate-400 group-hover:text-white transition-colors">
            <Maximize2 size={16} />
          </div>
        </button>
      ))}
    </div>
  )
}
