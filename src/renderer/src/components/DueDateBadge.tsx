import { Calendar } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface DueDateBadgeProps {
  dueDate: string
  className?: string
}

function getDueDateInfo(dueDate: string): { label: string; colorClass: string } {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Atrasada', colorClass: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (diffDays === 0) {
    return { label: 'Hoje', colorClass: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (diffDays <= 3) {
    return {
      label: diffDays === 1 ? 'Amanhã' : `${diffDays}d`,
      colorClass: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }
  return {
    label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    colorClass: 'bg-green-100 text-green-700 border-green-200'
  }
}

export function DueDateBadge({ dueDate, className }: DueDateBadgeProps): React.JSX.Element {
  const { label, colorClass } = getDueDateInfo(dueDate)

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
