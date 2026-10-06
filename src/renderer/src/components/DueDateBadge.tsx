import { Calendar } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { dueState, type DueKind } from '@shared/dueState'

interface DueDateBadgeProps {
  dueDate: string
  dueTime?: string | null
  className?: string
}

const KIND_CLASSES: Record<DueKind, string> = {
  overdue: 'bg-red-100 text-red-700 border-red-200',
  today: 'bg-red-100 text-red-700 border-red-200',
  tomorrow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  soon: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  later: 'bg-green-100 text-green-700 border-green-200'
}

export function DueDateBadge({
  dueDate,
  dueTime,
  className
}: DueDateBadgeProps): React.JSX.Element {
  const { kind, label } = dueState(dueDate, dueTime, new Date())
  const colorClass = KIND_CLASSES[kind]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
        colorClass,
        className
      )}
    >
      <Calendar size={10} />
      {label}
    </span>
  )
}
