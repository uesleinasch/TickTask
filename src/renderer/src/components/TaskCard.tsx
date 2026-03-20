import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import { AlertCircle, Activity, FolderKanban } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface TaskCardProps {
  task: Task
  selected: boolean
  onToggleSelection: (selected: boolean) => void
  onClick: () => void
}

function getTimeLeakStyles(task: Task): {
  cardBg: string
  borderColor: string
} {
  if (task.category !== 'time_leak') {
    return {
      cardBg: 'bg-white',
      borderColor: 'border-l-transparent hover:border-l-slate-900'
    }
  }

  const minutes = task.total_seconds / 60

  if (minutes >= 60) {
    return {
      cardBg: 'bg-red-50',
      borderColor: 'border-l-red-500 hover:border-l-red-600'
    }
  } else if (minutes >= 30) {
    return {
      cardBg: 'bg-orange-50',
      borderColor: 'border-l-orange-500 hover:border-l-orange-600'
    }
  } else if (minutes > 0) {
    return {
      cardBg: 'bg-yellow-50',
      borderColor: 'border-l-yellow-500 hover:border-l-yellow-600'
    }
  }

  return {
    cardBg: 'bg-white',
    borderColor: 'border-l-yellow-300 hover:border-l-yellow-500'
  }
}

export function TaskCard({
  task,
  selected,
  onToggleSelection,
  onClick
}: TaskCardProps): React.JSX.Element {
  const timeLeakStyles = getTimeLeakStyles(task)
  const isTimeLeak = task.category === 'time_leak'
  const isOverOneHour = isTimeLeak && task.total_seconds >= 3600

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1"
    >
      <div
        className={cn(
          'border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md h-full flex flex-col justify-between border-l-4 transition-all',
          timeLeakStyles.cardBg,
          timeLeakStyles.borderColor,
          selected && 'ring-2 ring-sky-300 border-sky-200'
        )}
      >
        <div>
          <div className="flex justify-end mb-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelection(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Selecionar tarefa ${task.name}`}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
          </div>

          {/* Header: Badges */}
          <div className="flex flex-wrap gap-2 items-start mb-2">
            <StatusBadge status={task.status} />
            <CategoryBadge category={task.category || 'normal'} />
            {task.time_limit_seconds && task.time_limit_seconds > 0 && (
              <span className="text-xs text-slate-400 flex items-center ml-auto">
                <AlertCircle size={12} className="mr-1" />
                {formatTime(task.time_limit_seconds)}
              </span>
            )}
          </div>

          {/* Project indicator */}
          {task.project_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <FolderKanban size={12} />
              <span className="truncate">{task.project_name}</span>
            </div>
          )}

          {/* Título */}
          <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">
            {task.name}
          </h3>

          {/* Descrição */}
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">
            {task.description || 'Sem descrição...'}
          </p>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Contextos */}
          {task.contexts && task.contexts.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.contexts.map((ctx) => (
                <span
                  key={ctx.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200 text-slate-600"
                >
                  <span className="text-[10px]">{ctx.icon}</span>
                  {ctx.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Timer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div
            className={cn(
              'text-2xl font-mono font-medium tabular-nums',
              task.is_running ? 'text-emerald-600' : 'text-slate-700',
              isOverOneHour && 'text-red-600 animate-pulse'
            )}
          >
            {formatTime(task.total_seconds)}
          </div>
          {task.is_running && (
            <div
              className={cn(
                'animate-pulse p-1.5 rounded-full',
                isTimeLeak ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'
              )}
            >
              <Activity size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
