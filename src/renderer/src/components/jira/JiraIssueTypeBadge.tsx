import { Bookmark, Bug, CheckSquare, CornerDownRight, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { JiraIssueKind } from '@shared/types'

const KIND_STYLE: Record<JiraIssueKind, { icon: LucideIcon; className: string }> = {
  epic: { icon: Zap, className: 'border-purple-200 bg-purple-50 text-purple-700' },
  story: { icon: Bookmark, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  task: { icon: CheckSquare, className: 'border-sky-200 bg-sky-50 text-sky-700' },
  bug: { icon: Bug, className: 'border-red-200 bg-red-50 text-red-700' },
  subtask: { icon: CornerDownRight, className: 'border-slate-200 bg-slate-50 text-slate-600' }
}

interface JiraIssueTypeBadgeProps {
  kind: JiraIssueKind | null | undefined
  name: string | null | undefined
  className?: string
}

export function JiraIssueTypeBadge({
  kind,
  name,
  className
}: JiraIssueTypeBadgeProps): React.JSX.Element | null {
  if (!kind || !name) return null
  const { icon: Icon, className: tone } = KIND_STYLE[kind]
  return (
    <span
      title={`Tipo no Jira: ${name}`}
      className={cn(
        'inline-flex h-6 max-w-[8rem] items-center gap-1 rounded-md border px-2 text-xs',
        tone,
        className
      )}
    >
      <Icon size={11} className="shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  )
}
