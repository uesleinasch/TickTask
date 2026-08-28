import type { ReactNode } from 'react'
import { ArrowLeft, Focus, Minimize2, Pause, Play } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { formatTime } from '@renderer/lib/utils'

interface NotesFocusBarProps {
  taskName: string
  displaySeconds: number
  isRunning: boolean
  isBlocked: boolean
  onStart: () => void
  onPause: () => void
  onLeaveTask: () => void
  onZen: () => void
  onRestore: () => void
  actions: ReactNode
}

export function NotesFocusBar({
  taskName,
  displaySeconds,
  isRunning,
  isBlocked,
  onStart,
  onPause,
  onLeaveTask,
  onZen,
  onRestore,
  actions
}: NotesFocusBarProps): React.JSX.Element {
  return (
    <div className="h-12 shrink-0 border-b border-slate-200 bg-white flex items-center gap-3 px-4">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onLeaveTask}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm shrink-0"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <span className="text-sm text-slate-400 truncate">{taskName}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'font-mono font-bold tabular-nums text-lg leading-none',
            isRunning ? 'text-slate-900' : 'text-slate-400'
          )}
        >
          {formatTime(displaySeconds)}
        </span>
        {!isRunning ? (
          <button
            onClick={onStart}
            disabled={isBlocked}
            title="Iniciar timer"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-emerald-600 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={14} className="fill-current" />
          </button>
        ) : (
          <button
            onClick={onPause}
            title="Pausar timer"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Pause size={14} className="fill-current" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
        {actions}
        <button
          onClick={onZen}
          title="Modo Zen — só o editor (Esc para sair)"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
        >
          <Focus size={14} />
        </button>
        <button
          onClick={onRestore}
          title="Voltar ao layout normal (Esc)"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
        >
          <Minimize2 size={14} />
        </button>
      </div>
    </div>
  )
}
