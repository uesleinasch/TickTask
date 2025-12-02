import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { formatTime, formatDateTime } from '@renderer/lib/utils'
import type { TimeEntry } from '../../../shared/types'

interface TimeEntryListProps {
  entries: TimeEntry[]
}

export function TimeEntryList({ entries }: TimeEntryListProps): React.JSX.Element {
  const completedEntries = entries.filter((e) => e.end_time !== null)

  if (completedEntries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Nenhuma sessão registrada ainda</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {completedEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
          >
            <span className="text-sm text-muted-foreground">
              {formatDateTime(entry.start_time)}
            </span>
            <span className="font-mono text-sm font-medium">
              {formatTime(entry.duration_seconds || 0)}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
