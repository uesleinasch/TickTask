import { useEffect, useRef, useState } from 'react'
import { UserRound, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { JiraField, JiraFieldInput, JiraUser } from '@shared/types'

const inputClass =
  'h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-slate-400 disabled:opacity-60'

interface EditorProps {
  field: JiraField
  taskId: number
  me: JiraUser | null
  saving: boolean
  onSave: (value: JiraFieldInput) => void
}

function toLocalDateTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function DraftInput({
  initial,
  type,
  saving,
  multiline,
  onCommit
}: {
  initial: string
  type: 'text' | 'number' | 'date' | 'datetime-local'
  saving: boolean
  multiline?: boolean
  onCommit: (value: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(initial)
  useEffect(() => setDraft(initial), [initial])
  const commit = (): void => {
    if (draft !== initial) onCommit(draft)
  }
  if (multiline) {
    return (
      <textarea
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={3}
        className={cn(inputClass, 'h-auto py-1.5')}
      />
    )
  }
  return (
    <input
      type={type}
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(initial)
      }}
      className={inputClass}
    />
  )
}

function LabelsEditor({
  value,
  saving,
  onSave
}: {
  value: string[]
  saving: boolean
  onSave: (value: string[]) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const add = (): void => {
    const label = draft.trim().replace(/\s+/g, '_')
    setDraft('')
    if (label && !value.includes(label)) onSave([...value, label])
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
        >
          {label}
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(value.filter((l) => l !== label))}
            className="text-slate-400 hover:text-slate-700"
            aria-label={`Remover ${label}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        disabled={saving}
        placeholder="Adicionar…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
        }}
        onBlur={add}
        className="h-7 min-w-[7rem] flex-1 rounded-md border border-dashed border-slate-200 bg-white px-2 text-xs outline-none focus:border-slate-400"
      />
    </div>
  )
}

function UserEditor({
  field,
  value,
  taskId,
  me,
  saving,
  onSave
}: {
  field: JiraField
  value: JiraUser | null
  taskId: number
  me: JiraUser | null
  saving: boolean
  onSave: (accountId: string | null) => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JiraUser[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    timer.current = setTimeout(() => {
      window.api
        .jiraSearchUsers(taskId, field.id, query.trim())
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, taskId, field.id])

  const pick = (accountId: string | null): void => {
    setQuery('')
    setResults(null)
    onSave(accountId)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm text-slate-800">
        <UserRound size={14} className="text-slate-400" />
        <span className="flex-1 truncate">{value?.displayName ?? 'Ninguém'}</span>
        {me && value?.accountId !== me.accountId && (
          <button
            type="button"
            disabled={saving}
            onClick={() => pick(me.accountId)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Atribuir a mim
          </button>
        )}
        {value && !field.required && (
          <button
            type="button"
            disabled={saving}
            onClick={() => pick(null)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Remover
          </button>
        )}
      </div>
      <div className="relative">
        <input
          value={query}
          disabled={saving}
          placeholder="Buscar pessoa…"
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass}
        />
        {results && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-md">
            {results.length === 0 ? (
              <li className="px-2 py-1 text-xs text-slate-500">Ninguém encontrado</li>
            ) : (
              results.map((user) => (
                <li key={user.accountId}>
                  <button
                    type="button"
                    onClick={() => pick(user.accountId)}
                    className="w-full px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {user.displayName}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

export function JiraFieldEditor({
  field,
  taskId,
  me,
  saving,
  onSave
}: EditorProps): React.JSX.Element {
  switch (field.kind) {
    case 'string':
    case 'text':
      return (
        <DraftInput
          initial={field.value ?? ''}
          type="text"
          multiline={field.kind === 'text'}
          saving={saving}
          onCommit={onSave}
        />
      )
    case 'number':
      return (
        <DraftInput
          initial={field.value === null ? '' : String(field.value)}
          type="number"
          saving={saving}
          onCommit={onSave}
        />
      )
    case 'date':
      return (
        <DraftInput initial={field.value ?? ''} type="date" saving={saving} onCommit={onSave} />
      )
    case 'datetime':
      return (
        <DraftInput
          initial={toLocalDateTime(field.value)}
          type="datetime-local"
          saving={saving}
          onCommit={onSave}
        />
      )
    case 'select':
    case 'sprint': {
      const current = field.value === null ? '' : String(field.value)
      return (
        <select
          value={current}
          disabled={saving}
          onChange={(e) => onSave(e.target.value || null)}
          className={inputClass}
        >
          {(!field.required || current === '') && <option value="">Nenhum</option>}
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }
    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options.length === 0 && <span className="text-xs text-slate-400">Sem opções</span>}
          {field.options.map((option) => {
            const checked = field.value.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                disabled={saving}
                onClick={() =>
                  onSave(
                    checked
                      ? field.value.filter((id) => id !== option.id)
                      : [...field.value, option.id]
                  )
                }
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors',
                  checked
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )
    case 'labels':
      return <LabelsEditor value={field.value} saving={saving} onSave={onSave} />
    case 'user':
      return (
        <UserEditor
          field={field}
          value={field.value}
          taskId={taskId}
          me={me}
          saving={saving}
          onSave={onSave}
        />
      )
    case 'readonly':
      return <p className="text-sm text-slate-600">{field.value || '—'}</p>
  }
}
