import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { toast } from '@renderer/components/ui/sonner'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import type { JiraFieldInput, JiraIssueFields } from '@shared/types'
import { JiraFieldEditor } from './JiraFieldEditor'
import { JiraStatusSelect } from './JiraStatusSelect'

interface JiraFieldsSheetProps {
  taskId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JiraFieldsSheet({
  taskId,
  open,
  onOpenChange
}: JiraFieldsSheetProps): React.JSX.Element {
  const [issue, setIssue] = useState<JiraIssueFields | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setIssue(await window.api.jiraGetFields(taskId))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function save(fieldId: string, value: JiraFieldInput): Promise<void> {
    setSavingField(fieldId)
    try {
      setIssue(await window.api.jiraUpdateField(taskId, fieldId, value))
    } catch (error) {
      toast.error(errorMessage(error))
      setRevision((r) => r + 1)
    } finally {
      setSavingField(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{issue?.key ?? 'Jira'}</span>
            {issue && (
              <button
                type="button"
                onClick={() => window.api.appOpenExternal(issue.url).catch(() => undefined)}
                className="text-slate-400 hover:text-slate-700"
                title="Abrir no Jira"
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="text-slate-400 hover:text-slate-700"
              title="Recarregar"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            </button>
          </SheetTitle>
          <SheetDescription>
            Campos editáveis da issue. Cada mudança vai direto para o Jira.
          </SheetDescription>
          {issue && (
            <div className="pt-1">
              <JiraStatusSelect taskId={taskId} status={issue.statusName} onChanged={load} />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!issue ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Carregando campos…' : 'Não foi possível carregar a issue.'}
            </div>
          ) : (
            <dl className="space-y-4">
              {issue.fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    {field.name}
                    {field.required && <span className="text-red-400">*</span>}
                    {savingField === field.id && (
                      <Loader2 size={11} className="animate-spin text-slate-400" />
                    )}
                  </dt>
                  <dd>
                    <JiraFieldEditor
                      key={`${field.id}:${revision}:${JSON.stringify(field.value)}`}
                      field={field}
                      taskId={taskId}
                      me={issue.me}
                      saving={savingField !== null}
                      onSave={(value) => save(field.id, value)}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
