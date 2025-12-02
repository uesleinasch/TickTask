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
      <div className="text-slate-400 text-sm italic">Nenhuma sessão registrada ainda.</div>
    )
  }

  return (
    <ScrollArea className="max-h-[250px]">
      <div className="space-y-2">
        {completedEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg text-sm"
          >
            <div className="text-slate-600">{formatDateTime(entry.start_time)}</div>
            <div className="font-mono text-slate-900">+ {formatTime(entry.duration_seconds || 0)}</div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
