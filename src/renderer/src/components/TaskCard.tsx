import { StatusBadge } from './StatusBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import { AlertCircle, Activity } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md h-full flex flex-col justify-between border-l-4 border-l-transparent hover:border-l-slate-900 transition-all">
        <div>
          {/* Header: Badge + Limite */}
          <div className="flex justify-between items-start mb-2">
            <StatusBadge status={task.status} />
            {task.time_limit_seconds && task.time_limit_seconds > 0 && (
              <span className="text-xs text-slate-400 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                Limite: {formatTime(task.time_limit_seconds)}
              </span>
            )}
          </div>

          {/* Título */}
          <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">
            {task.name}
          </h3>

          {/* Descrição */}
          <p className="text-slate-500 text-sm line-clamp-2 mb-4">
            {task.description || 'Sem descrição...'}
          </p>
        </div>

        {/* Footer: Timer + Indicator */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div
            className={`text-2xl font-mono font-medium tabular-nums ${task.is_running ? 'text-emerald-600' : 'text-slate-700'}`}
          >
            {formatTime(task.total_seconds)}
          </div>
          {task.is_running && (
            <div className="animate-pulse bg-emerald-100 p-1.5 rounded-full text-emerald-600">
              <Activity size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
