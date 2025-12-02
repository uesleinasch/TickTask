import { Badge } from '@renderer/components/ui/badge'
import { cn } from '@renderer/lib/utils'
import type { TaskStatus } from '../../../shared/types'
import { STATUS_LABELS } from '../../../shared/types'

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusColors: Record<TaskStatus, string> = {
  inbox: 'bg-gray-500 hover:bg-gray-500/80',
  aguardando: 'bg-yellow-500 hover:bg-yellow-500/80',
  proximas: 'bg-blue-500 hover:bg-blue-500/80',
  executando: 'bg-green-500 hover:bg-green-500/80',
  finalizada: 'bg-purple-500 hover:bg-purple-500/80'
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <Badge className={cn(statusColors[status], 'text-white', className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
