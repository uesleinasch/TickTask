import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'
import { isSafeHttpUrl } from '@shared/externalUrl'

interface ExternalLinkFieldProps {
  value: string | null | undefined
  onSave: (value: string | null) => Promise<void>
}

export function ExternalLinkField({ value, onSave }: ExternalLinkFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(value ?? '')

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  const commit = async (): Promise<void> => {
    const next = draft.trim()
    if (next === (value ?? '')) return
    if (next && !isSafeHttpUrl(next)) {
      toast.error('Informe um link http:// ou https://')
      setDraft(value ?? '')
      return
    }
    await onSave(next || null)
  }

  const open = (): void => {
    window.api.appOpenExternal(value as string).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o link')
    })
  }

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">Link externo</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          placeholder="https://..."
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className="flex-1 min-w-0 h-8 px-2 rounded-lg text-xs border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
        />
        {value && isSafeHttpUrl(value) && (
          <button
            type="button"
            onClick={open}
            title="Abrir link"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
