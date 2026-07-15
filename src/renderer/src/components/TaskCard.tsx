import { useState, useCallback } from 'react'
import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { DueDateBadge } from './DueDateBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import {
  AlertCircle,
  Activity,
  Lock,
  ListChecks,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  CheckSquare
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface TaskCardProps {
  task: Task
  selected: boolean
  onToggleSelection: (selected: boolean) => void
  onClick: () => void
  onScheduleForToday?: (taskId: number) => void
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

const todayStr = (): string => new Date().toISOString().split('T')[0]

export function TaskCard({
  task,
  selected,
  onToggleSelection,
  onClick,
  onScheduleForToday
}: TaskCardProps): React.JSX.Element {
  const timeLeakStyles = getTimeLeakStyles(task)
  const isTimeLeak = task.category === 'time_leak'
  const isOverOneHour = isTimeLeak && task.total_seconds >= 3600
  const isScheduledToday = task.scheduled_date === todayStr()
  const hasSubtasks = (task.subtask_count ?? 0) > 0
  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])

  const toggleExpand = useCallback(async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!expanded && subtasks.length === 0) {
      const subs = await window.api.listSubtasks(task.id)
      setSubtasks(subs)
    }
    setExpanded((prev) => !prev)
  }, [expanded, subtasks.length, task.id])

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1"
    >
      <div
        className={cn(
          'border border-slate-200 rounded-xl p-5 hover:shadow-md h-full flex flex-col justify-between border-l-4 transition-all',
          timeLeakStyles.cardBg,
          timeLeakStyles.borderColor,
          selected && 'ring-2 ring-sky-300 border-sky-200'
        )}
      >
        <div>
          <div className="flex justify-between items-start mb-1">
            {/* Lock icon for blocked tasks */}
            {task.is_blocked && (
              <span title="Bloqueada por dependências" className="text-orange-400">
                <Lock size={14} />
              </span>
            )}
            <div className="flex-1" />
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

          {/* Due date + scheduled today indicator */}
          <div className="flex flex-wrap gap-1.5 items-center mb-2">
            {task.due_date && <DueDateBadge dueDate={task.due_date} />}
            {isScheduledToday && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <CalendarDays size={10} />
                Hoje
              </span>
            )}
          </div>

          {/* Project indicator */}
          {task.project_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: task.project_color || '#6366f1' }}
              />
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

          {/* Subtask progress + expand */}
          {hasSubtasks && (
            <div className="mb-2">
              <button
                onClick={toggleExpand}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors w-full text-left"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <ListChecks size={12} />
                <span>
                  {task.completed_subtask_count}/{task.subtask_count} subtarefas
                </span>
              </button>
              {expanded && (
                <div className="mt-1.5 pl-3 border-l-2 border-slate-100 space-y-1">
                  {subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      {sub.status === 'finalizada' ? (
                        <CheckSquare size={12} className="text-purple-400 flex-shrink-0" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          'text-xs text-slate-600 truncate',
                          sub.status === 'finalizada' && 'line-through text-slate-400'
                        )}
                      >
                        {sub.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

        {/* Footer: Timer + actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div
            className={cn(
              'text-2xl font-mono font-medium tabular-nums shrink-0',
              task.is_running ? 'text-emerald-600' : 'text-slate-700',
              isOverOneHour && 'text-red-600 animate-pulse'
            )}
          >
            {formatTime(task.total_seconds)}
          </div>
          <div className="flex items-center gap-2">
            {onScheduleForToday && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onScheduleForToday(task.id)
                }}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all',
                  isScheduledToday
                    ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 hover:border-blue-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                )}
                title={isScheduledToday ? 'Remover do plano de hoje' : 'Adicionar ao plano de hoje'}
              >
                <CalendarDays size={12} />
                {isScheduledToday ? 'Hoje ✓' : 'Hoje'}
              </button>
            )}
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
    </div>
  )
}
