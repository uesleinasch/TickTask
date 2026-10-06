import { Clock } from 'lucide-react'
import { localDateString } from '@shared/dueState'
import { formatTimeRange } from '@shared/taskTime'
import { cn } from '@renderer/lib/utils'

export function ScheduledTimeBadge({
  date,
  start,
  end,
  className
}: {
  date?: string | null
  start?: string | null
  end?: string | null
  className?: string
}): React.JSX.Element | null {
  const range = formatTimeRange(start, end)
  if (!date || !range) return null
  const [, month, day] = date.slice(0, 10).split('-')
  const isToday = date.slice(0, 10) === localDateString(new Date())

  return (
    <span
      title="Horário agendado"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 tabular-nums',
        className
      )}
    >
      <Clock size={10} />
      {isToday ? range : `${day}/${month} · ${range}`}
    </span>
  )
}
