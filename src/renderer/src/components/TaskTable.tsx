import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import { Activity, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface TaskTableProps {
  tasks: Task[]
  onTaskClick: (taskId: number) => void
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

export function TaskTable({ tasks, onTaskClick }: TaskTableProps): React.JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Crie uma nova tarefa para começar</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Tarefa
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
              Categoria
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-40">
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

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={cn(
                  'cursor-pointer transition-colors group',
                  rowStyles
                )}
              >
                {/* Tarefa */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Indicador de running */}
                    <div className="w-2 flex-shrink-0">
                      {task.is_running && (
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full animate-pulse',
                            isTimeLeak ? 'bg-yellow-500' : 'bg-emerald-500'
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'font-medium text-slate-900 truncate group-hover:text-slate-700',
                          task.is_running && 'font-semibold'
                        )}
                      >
                        {task.name}
                      </p>
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
                  {task.time_limit_seconds && task.time_limit_seconds > 0 ? (
                    <span className="text-xs text-slate-400 font-mono flex items-center justify-end gap-1">
                      <AlertCircle size={12} />
                      {formatTime(task.time_limit_seconds)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
