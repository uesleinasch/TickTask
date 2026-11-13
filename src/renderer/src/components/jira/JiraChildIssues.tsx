import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { JiraChildrenResult } from '@shared/types'
import { JiraIssueTypeBadge } from './JiraIssueTypeBadge'

interface JiraChildIssuesProps {
  taskId: number
  header: React.ReactNode
  className?: string
}

export function JiraChildIssues({
  taskId,
  header,
  className
}: JiraChildIssuesProps): React.JSX.Element | null {
  const navigate = useNavigate()
  const [result, setResult] = useState<JiraChildrenResult | null>(null)

  useEffect(() => {
    let active = true
    setResult(null)
    window.api
      .jiraGetChildren(taskId)
      .then((value) => active && setResult(value))
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Falha ao consultar o Jira.'
        setResult({ children: [], remoteError: message })
      })
    return () => {
      active = false
    }
  }, [taskId])

  if (result && result.children.length === 0 && !result.remoteError) return null

  return (
    <div className={className}>
      {header}
      {!result ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Buscando issues filhas no Jira...
        </div>
      ) : (
        <>
          {result.remoteError && (
            <p className="mb-2 text-xs text-amber-600">
              Não foi possível consultar o Jira ({result.remoteError}). Mostrando só as importadas.
            </p>
          )}
          <ul className="space-y-1">
            {result.children.map((child) => (
              <li key={child.key}>
                <button
                  type="button"
                  onClick={() =>
                    child.taskId
                      ? navigate(`/task/${child.taskId}`)
                      : void window.api.appOpenExternal(child.url)
                  }
                  title={
                    child.taskId ? 'Abrir a task no TickTask' : 'Não importada — abrir no Jira'
                  }
                  className="group w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <JiraIssueTypeBadge kind={child.issueKind} name={child.issueType} />
                  <span className="shrink-0 font-mono text-xs text-slate-500">{child.key}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700 group-hover:text-slate-900">
                    {child.summary}
                  </span>
                  {child.statusName && (
                    <span className="shrink-0 text-xs text-slate-400">{child.statusName}</span>
                  )}
                  {!child.taskId && <ExternalLink size={12} className="shrink-0 text-slate-300" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
