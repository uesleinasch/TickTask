import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@renderer/components/ui/select'
import { toast } from '@renderer/components/ui/sonner'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { cn } from '@renderer/lib/utils'
import type { JiraTransitionOption } from '@shared/types'

const CATEGORY_DOT: Record<JiraTransitionOption['category'], string> = {
  new: 'bg-slate-400',
  indeterminate: 'bg-blue-500',
  done: 'bg-emerald-500'
}

interface JiraStatusSelectProps {
  taskId: number
  status: string | null | undefined
  className?: string
  onChanged?: (status: string) => void
}

export function JiraStatusSelect({
  taskId,
  status,
  className,
  onChanged
}: JiraStatusSelectProps): React.JSX.Element {
  const [current, setCurrent] = useState(status ?? '')
  const [transitions, setTransitions] = useState<JiraTransitionOption[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setCurrent(status ?? ''), [status])

  async function load(open: boolean): Promise<void> {
    if (!open) return
    setTransitions(null)
    try {
      setTransitions(await window.api.jiraListTransitions(taskId))
    } catch (error) {
      setTransitions([])
      toast.error(errorMessage(error))
    }
  }

  async function apply(transitionId: string): Promise<void> {
    const target = transitions?.find((t) => t.id === transitionId)
    if (!target) return
    setSaving(true)
    try {
      await window.api.jiraTransition(taskId, transitionId)
      setCurrent(target.name)
      onChanged?.(target.name)
      toast.success(`Jira: ${target.name}`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select value="" onValueChange={apply} onOpenChange={load} disabled={saving}>
      <SelectTrigger
        title="Status no Jira"
        className={cn(
          'h-6 gap-1 rounded-md border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 shadow-none hover:bg-blue-100',
          className
        )}
      >
        {saving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <span className="font-mono">Jira</span>
        )}
        <span className="max-w-[10rem] truncate">{current || 'Sem status'}</span>
      </SelectTrigger>
      <SelectContent className="bg-white">
        {transitions === null ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500">
            <Loader2 size={12} className="animate-spin" />
            Carregando transições…
          </div>
        ) : transitions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-slate-500">Nenhuma transição disponível</div>
        ) : (
          transitions.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className={cn('h-2 w-2 rounded-full', CATEGORY_DOT[t.category])} />
              {t.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
