import { cn } from '@renderer/lib/utils'
import type { TaskStatus } from '../../../shared/types'
import { STATUS_LABELS } from '../../../shared/types'

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

// Cores conforme Design System - bg-100 + text-600 + border
const statusStyles: Record<TaskStatus, string> = {
  inbox: 'bg-slate-100 text-slate-500 border-slate-200',
  aguardando: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  proximas: 'bg-blue-100 text-blue-600 border-blue-200',
  executando: 'bg-emerald-100 text-emerald-600 border-emerald-200 animate-pulse',
  finalizada: 'bg-purple-100 text-purple-600 border-purple-200'
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
