import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { Task } from '@shared/types'
import { JiraFieldsSheet } from './JiraFieldsSheet'
import { JiraStatusSelect } from './JiraStatusSelect'

interface JiraTaskControlsProps {
  task: Pick<Task, 'id' | 'jira_key' | 'jira_status'>
  className?: string
  showKey?: boolean
}

export function JiraTaskControls({
  task,
  className,
  showKey = false
}: JiraTaskControlsProps): React.JSX.Element | null {
  const [sheetOpen, setSheetOpen] = useState(false)
  if (!task.jira_key) return null

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {showKey && <span className="font-mono text-xs text-slate-500">{task.jira_key}</span>}
      <JiraStatusSelect taskId={task.id} status={task.jira_status} />
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        title="Campos do Jira"
        aria-label="Abrir campos do Jira"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
      >
        <SlidersHorizontal size={12} />
      </button>
      <JiraFieldsSheet taskId={task.id} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
