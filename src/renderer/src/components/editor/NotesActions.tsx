import { RefreshCw, Save } from 'lucide-react'

interface NotesActionsProps {
  localExportPath: string | null
  exportingLocal: boolean
  onExportLocal: () => void
  syncingNotes: boolean
  onSaveAndSync: () => void
}

export function NotesActions({
  localExportPath,
  exportingLocal,
  onExportLocal,
  syncingNotes,
  onSaveAndSync
}: NotesActionsProps): React.JSX.Element {
  return (
    <>
      <button
        onClick={onExportLocal}
        disabled={exportingLocal}
        title={localExportPath ?? 'Salvar em um arquivo local (Markdown)'}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Save size={13} />
        <span className="max-w-[140px] truncate">
          {exportingLocal
            ? 'Salvando...'
            : localExportPath
              ? localExportPath.split(/[\\/]/).pop() || 'Arquivo local'
              : 'Salvar local'}
        </span>
      </button>
      <button
        onClick={onSaveAndSync}
        disabled={syncingNotes}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={13} className={syncingNotes ? 'animate-spin' : ''} />
        {syncingNotes ? 'Sincronizando...' : 'Salvar e sincronizar'}
      </button>
    </>
  )
}
