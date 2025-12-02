import { StatusBadge } from './StatusBadge'
import { CategoryBadge } from './CategoryBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import { AlertCircle, Activity } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

// Função para determinar o estilo do card baseado na categoria Time Leak
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
    // Vermelho: mais de 1 hora
    return {
      cardBg: 'bg-red-50',
      borderColor: 'border-l-red-500 hover:border-l-red-600'
    }
  } else if (minutes >= 30) {
    // Laranja: mais de 30 minutos
    return {
      cardBg: 'bg-orange-50',
      borderColor: 'border-l-orange-500 hover:border-l-orange-600'
    }
  } else if (minutes > 0) {
    // Amarelo claro: menos de 30 minutos
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

export function TaskCard({ task, onClick }: TaskCardProps): React.JSX.Element {
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
          timeLeakStyles.borderColor
        )}
      >
        <div>
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
