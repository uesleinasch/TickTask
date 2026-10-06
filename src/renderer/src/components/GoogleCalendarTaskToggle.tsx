import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

interface GoogleCalendarTaskToggleProps {
  taskId: number
  enabled: boolean
  onChange: () => void
}

export function GoogleCalendarTaskToggle({
  taskId,
  enabled,
  onChange
}: GoogleCalendarTaskToggleProps): React.JSX.Element | null {
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api.gcalGetStatus().then((status) => setConnected(status.connected))
  }, [])

  if (!connected) return null

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    try {
      await action()
    } catch {
      toast.error('Não foi possível sincronizar com o Google Calendar.')
    } finally {
      setBusy(false)
      onChange()
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 h-8">
      <label className="text-xs text-slate-400">Google Calendar</label>
      <div className="flex items-center gap-2">
        {enabled && (
          <button
            type="button"
            title="Ressincronizar com o Google Calendar"
            disabled={busy}
            onClick={() => run(() => window.api.gcalSyncTask(taskId))}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={() => run(() => window.api.gcalSetTaskSync(taskId, !enabled))}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
