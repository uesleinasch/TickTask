import { Card, CardContent } from '@renderer/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps): React.JSX.Element {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] py-4"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{task.name}</h3>
          <p className="text-muted-foreground text-sm font-mono">
            {formatTime(task.total_seconds)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {task.is_running && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
          <StatusBadge status={task.status} />
        </div>
      </CardContent>
    </Card>
  )
}
