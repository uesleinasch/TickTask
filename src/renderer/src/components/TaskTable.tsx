import React, { useEffect, useRef, useState, useCallback } from 'react'
import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { DueDateBadge } from './DueDateBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import {
  Activity,
  Clock,
  AlertCircle,
  Lock,
  ListChecks,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  CheckSquare
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const todayStr = (): string => new Date().toISOString().split('T')[0]

interface TaskTableProps {
  tasks: Task[]
  onTaskClick: (taskId: number) => void
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onToggleSelectAll: (selected: boolean) => void
  onScheduleForToday?: (taskId: number) => void
}

// Função para determinar o estilo da linha baseado na categoria Time Leak
function getTimeLeakRowStyles(task: Task): string {
  if (task.category !== 'time_leak') {
    return 'hover:bg-slate-50'
  }

  const minutes = task.total_seconds / 60

  if (minutes >= 60) {
    return 'bg-red-50 hover:bg-red-100'
  } else if (minutes >= 30) {
    return 'bg-orange-50 hover:bg-orange-100'
  } else if (minutes > 0) {
    return 'bg-yellow-50 hover:bg-yellow-100'
  }

  return 'hover:bg-yellow-50'
}

export function TaskTable({
  tasks,
  onTaskClick,
  selectedTaskIds,
  onToggleTaskSelection,
  onToggleSelectAll,
  onScheduleForToday
}: TaskTableProps): React.JSX.Element {
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [subtasksMap, setSubtasksMap] = useState<Record<number, Task[]>>({})

  const toggleExpand = useCallback(async (taskId: number, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
    if (!subtasksMap[taskId]) {
      const subs = await window.api.listSubtasks(taskId)
      setSubtasksMap((prev) => ({ ...prev, [taskId]: subs }))
    }
  }, [subtasksMap])
  const selectedVisibleCount = tasks.filter((task) => selectedTaskIds.has(task.id)).length
  const allVisibleSelected = tasks.length > 0 && selectedVisibleCount === tasks.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Crie uma nova tarefa para começar</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-3 w-12">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Selecionar todas as tarefas visíveis"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Tarefa
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
              Categoria
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
              Projeto
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
              Tags
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
              <div className="flex items-center justify-end gap-1">
                <Clock size={12} />
                Tempo
              </div>
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
              Limite
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const isTimeLeak = task.category === 'time_leak'
            const isOverOneHour = isTimeLeak && task.total_seconds >= 3600
            const rowStyles = getTimeLeakRowStyles(task)
            const isSelected = selectedTaskIds.has(task.id)
            const isScheduledToday = task.scheduled_date === todayStr()
            const hasSubtasks = (task.subtask_count ?? 0) > 0

            return (
              <React.Fragment key={task.id}>
              <tr
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest('input[type="checkbox"]')) {
                    return
                  }
                  onTaskClick(task.id)
                }}
                className={cn(
                  'cursor-pointer transition-colors group',
                  rowStyles,
                  isSelected && '!bg-sky-50 hover:!bg-sky-100'
                )}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleTaskSelection(task.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Selecionar tarefa ${task.name}`}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                </td>

                {/* Tarefa */}
                <td className="px-4 py-3 max-w-0">
                  <div className="flex items-center gap-2">
                    {/* Expand toggle */}
                    <div className="w-7 flex-shrink-0 flex items-center justify-center">
                      {hasSubtasks ? (
                        <button
                          onClick={(e) => toggleExpand(task.id, e)}
                          title={expandedIds.has(task.id) ? 'Recolher subtarefas' : 'Expandir subtarefas'}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          {expandedIds.has(task.id)
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                    </div>

                    {/* Lock icon for blocked */}
                    <div className="w-4 flex-shrink-0 flex items-center justify-center">
                      {task.is_blocked ? (
                        <span title="Bloqueada por dependências">
                          <Lock size={14} className="text-orange-400" />
                        </span>
                      ) : task.is_running ? (
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full animate-pulse',
                            isTimeLeak ? 'bg-yellow-500' : 'bg-emerald-500'
                          )}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p
                          className={cn(
                            'font-medium text-slate-900 truncate min-w-0 group-hover:text-slate-700',
                            task.is_running && 'font-semibold'
                          )}
                        >
                          {task.name}
                        </p>
                        {task.due_date && (
                          <span className="shrink-0">
                            <DueDateBadge dueDate={task.due_date} />
                          </span>
                        )}
                        {onScheduleForToday && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onScheduleForToday(task.id)
                            }}
                            title={isScheduledToday ? 'Remover do plano de hoje' : 'Adicionar ao plano de hoje'}
                            className={cn(
                              'shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border transition-all',
                              isScheduledToday
                                ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                            )}
                          >
                            <CalendarDays size={10} />
                            {isScheduledToday ? 'Hoje ✓' : 'Hoje'}
                          </button>
                        )}
                        {hasSubtasks && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-xs text-slate-400">
                            <ListChecks size={11} />
                            {task.completed_subtask_count}/{task.subtask_count}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate max-w-md">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>

                {/* Categoria */}
                <td className="px-4 py-3">
                  <CategoryBadge category={task.category || 'normal'} />
                </td>

                {/* Projeto */}
                <td className="px-4 py-3">
                  {task.project_name ? (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: task.project_color || '#6366f1' }}
                      />
                      <span className="truncate max-w-[100px]">{task.project_name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>

                {/* Tags */}
                <td className="px-4 py-3">
                  {task.tags && task.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="text-xs text-slate-400">+{task.tags.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>

                {/* Tempo */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={cn(
                        'font-mono text-sm font-medium tabular-nums',
                        task.is_running ? 'text-emerald-600' : 'text-slate-700',
                        isOverOneHour && 'text-red-600 font-bold'
                      )}
                    >
                      {formatTime(task.total_seconds)}
                    </span>
                    {task.is_running && (
                      <Activity
                        size={14}
                        className={cn(
                          'animate-pulse',
                          isTimeLeak ? 'text-yellow-500' : 'text-emerald-500'
                        )}
                      />
                    )}
                  </div>
                </td>

                {/* Limite */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {task.time_limit_seconds && task.time_limit_seconds > 0 ? (
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <AlertCircle size={12} />
                        {formatTime(task.time_limit_seconds)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* Subtask rows */}
              {expandedIds.has(task.id) &&
                (subtasksMap[task.id] ?? []).map((sub) => (
                  <tr
                    key={`sub-${sub.id}`}
                    onClick={() => onTaskClick(sub.id)}
                    className="cursor-pointer bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
                  >
                    <td />
                    <td className="px-4 py-2 pl-16 max-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-px h-4 bg-slate-300 -ml-5 mr-3 shrink-0" />
                        {sub.status === 'finalizada' ? (
                          <CheckSquare size={13} className="text-purple-400 flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-sm text-slate-700 truncate min-w-0',
                            sub.status === 'finalizada' && 'line-through text-slate-400'
                          )}
                        >
                          {sub.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="px-4 py-2 text-right">
                      <span className="font-mono text-xs text-slate-400">
                        {formatTime(sub.total_seconds)}
                      </span>
                    </td>
                    <td />
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
