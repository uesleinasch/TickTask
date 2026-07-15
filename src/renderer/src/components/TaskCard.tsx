import { useState, useCallback } from 'react'
import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { DueDateBadge } from './DueDateBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import {
  Activity,
  Lock,
  ListChecks,
  CalendarDays,
  Clock,
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

function getTimeLeakVisual(task: Task): { cardBg: string; accentColor: string | null } {
  if (task.category !== 'time_leak') {
    return { cardBg: 'bg-white', accentColor: null }
  }

  const minutes = task.total_seconds / 60

  if (minutes >= 60) return { cardBg: 'bg-red-50', accentColor: '#ef4444' }
  if (minutes >= 30) return { cardBg: 'bg-orange-50', accentColor: '#f97316' }
  if (minutes > 0) return { cardBg: 'bg-yellow-50', accentColor: '#eab308' }
  return { cardBg: 'bg-white', accentColor: '#fde047' }
}

const todayStr = (): string => new Date().toISOString().split('T')[0]

export function TaskCard({
  task,
  selected,
  onToggleSelection,
  onClick,
  onScheduleForToday
}: TaskCardProps): React.JSX.Element {
  const timeLeakVisual = getTimeLeakVisual(task)
  const isTimeLeak = task.category === 'time_leak'
  const isOverOneHour = isTimeLeak && task.total_seconds >= 3600
  const isScheduledToday = task.scheduled_date === todayStr()
  const hasSubtasks = (task.subtask_count ?? 0) > 0
  const hasTimeLimit = !!task.time_limit_seconds && task.time_limit_seconds > 0
  const showTimer = task.is_running || task.total_seconds > 0
  const hasTagsOrContexts =
    (task.tags && task.tags.length > 0) || (task.contexts && task.contexts.length > 0)
  const hasMetaRow = !!task.due_date || hasTimeLimit || hasSubtasks

  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])

  const toggleExpand = useCallback(
    async (e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      if (!expanded && subtasks.length === 0) {
        const subs = await window.api.listSubtasks(task.id)
        setSubtasks(subs)
      }
      setExpanded((prev) => !prev)
    },
    [expanded, subtasks.length, task.id]
  )

  // Acento lateral: sempre visível quando executando ou time leak; senão só no hover
  const accentColor = task.is_running ? '#10b981' : (timeLeakVisual.accentColor ?? '#cbd5e1')
  const accentAlways = task.is_running || timeLeakVisual.accentColor !== null

  return (
    <div onClick={onClick} className="group cursor-pointer h-full">
      <div
        className={cn(
          'relative h-full flex flex-col gap-2.5 overflow-hidden rounded-sm border border-slate-200 p-4',
          'transition-all duration-200 hover:border-slate-300 hover:-translate-y-0.5',
          timeLeakVisual.cardBg,
          selected && 'ring-2 ring-sky-300 border-sky-200'
        )}
      >
        {/* Acento lateral (barra sobreposta — não altera a borda padrão) */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 top-0 bottom-0 w-1 transition-opacity duration-200',
            accentAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          style={{ backgroundColor: accentColor }}
        />

        {/* Topo: título (herói) + seleção */}
        <div className="flex items-start gap-2">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            {task.is_blocked && (
              <span title="Bloqueada por dependências" className="text-orange-400 mt-0.5 shrink-0">
                <Lock size={13} />
              </span>
            )}
            <h3 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2">
              {task.name}
            </h3>
          </div>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelection(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Selecionar tarefa ${task.name}`}
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-400 transition-opacity',
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          />
        </div>

        {/* Identidade: projeto + status (+ categoria se relevante) */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs">
          {task.project_name && (
            <span className="inline-flex items-center gap-1.5 text-slate-500 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: task.project_color || '#6366f1' }}
              />
              <span className="truncate max-w-[150px]">{task.project_name}</span>
            </span>
          )}
          <StatusBadge status={task.status} />
          {task.category && task.category !== 'normal' && (
            <CategoryBadge category={task.category} />
          )}
        </div>

        {/* Descrição (só se houver) */}
        {task.description && (
          <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{task.description}</p>
        )}

        {/* Chips: due date, limite, subtarefas */}
        {hasMetaRow && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
            {task.due_date && <DueDateBadge dueDate={task.due_date} />}
            {hasTimeLimit && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatTime(task.time_limit_seconds as number)}
              </span>
            )}
            {hasSubtasks && (
              <button
                onClick={toggleExpand}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title={expanded ? 'Recolher subtarefas' : 'Expandir subtarefas'}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <ListChecks size={13} />
                {task.completed_subtask_count}/{task.subtask_count}
              </button>
            )}
          </div>
        )}

        {/* Lista de subtarefas expandida */}
        {expanded && hasSubtasks && (
          <div className="pl-3 border-l-2 border-slate-100 space-y-1">
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2">
                {sub.status === 'finalizada' ? (
                  <CheckSquare size={12} className="text-purple-400 shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0" />
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

        {/* Tags + contextos */}
        {hasTagsOrContexts && (
          <div className="flex flex-wrap gap-1">
            {task.tags?.map((tag) => (
              <span
                key={`t-${tag.id}`}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {task.contexts?.map((ctx) => (
              <span
                key={`c-${ctx.id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200 text-slate-600"
              >
                <span className="text-[10px]">{ctx.icon}</span>
                {ctx.name}
              </span>
            ))}
          </div>
        )}

        {/* Rodapé: timer + ações */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 min-h-[2.75rem]">
          {showTimer ? (
            <div
              className={cn(
                'inline-flex items-center gap-1.5 text-lg font-mono font-medium tabular-nums',
                task.is_running ? 'text-emerald-600' : 'text-slate-600',
                isOverOneHour && 'text-red-600 animate-pulse'
              )}
            >
              {task.is_running && <Activity size={15} className="animate-pulse" />}
              {formatTime(task.total_seconds)}
            </div>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}

          {onScheduleForToday && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onScheduleForToday(task.id)
              }}
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all',
                isScheduledToday
                  ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                  : 'border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100'
              )}
              title={isScheduledToday ? 'Remover do plano de hoje' : 'Adicionar ao plano de hoje'}
            >
              <CalendarDays size={12} />
              {isScheduledToday ? 'Hoje ✓' : 'Hoje'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
