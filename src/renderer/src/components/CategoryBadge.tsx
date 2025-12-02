import { AlertTriangle, Flag, Circle, Clock } from 'lucide-react'
import type { TaskCategory } from '../../../shared/types'
import { CATEGORY_LABELS } from '../../../shared/types'

interface CategoryBadgeProps {
  category: TaskCategory
  size?: 'sm' | 'md'
}

const categoryStyles: Record<TaskCategory, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  prioridade: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  time_leak: 'bg-yellow-100 text-yellow-700 border-yellow-200'
}

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  urgente: <AlertTriangle size={12} />,
  prioridade: <Flag size={12} />,
  normal: <Circle size={12} />,
  time_leak: <Clock size={12} />
}

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps): React.JSX.Element {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${categoryStyles[category]} ${sizeClasses}`}
    >
      {categoryIcons[category]}
      {CATEGORY_LABELS[category]}
    </span>
  )
}
