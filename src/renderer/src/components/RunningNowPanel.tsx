import { useNavigate } from 'react-router-dom'
import { Activity, Square, StopCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { formatTime } from '@renderer/lib/utils'
import { useTimerStore } from '@renderer/stores/timerStore'

export function RunningNowPanel(): React.JSX.Element | null {
  const navigate = useNavigate()
  const { timers, stopTimer, stopAllTimers } = useTimerStore()

  const active = Object.values(timers)
  if (active.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          Em execução agora ({active.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => stopAllTimers()}
          className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
        >
          <StopCircle size={16} /> Parar todos
        </Button>
      </div>
      <ul className="space-y-2">
        {active.map((t) => (
          <li
            key={t.task.id}
            className="flex items-center gap-3 rounded-lg bg-white border border-slate-200 px-3 py-2"
          >
            <Activity size={16} className="text-emerald-500 shrink-0" />
            <button
              onClick={() => navigate(`/task/${t.task.id}`)}
              className="flex-1 min-w-0 text-left text-sm text-slate-700 truncate hover:text-slate-900"
            >
              {t.task.name}
            </button>
            <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
              {formatTime(t.displaySeconds)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => stopTimer(t.task.id)}
              className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50 shrink-0"
              title="Parar"
            >
              <Square size={13} fill="currentColor" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
