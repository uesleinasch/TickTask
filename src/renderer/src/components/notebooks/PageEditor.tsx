import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import type { NotebookPage } from '@shared/types'
import { NotesPanel, type NotesTab } from '@renderer/components/editor/NotesPanel'
import type { TaskNotesEditorHandle } from '@renderer/components/editor/TaskNotesEditor'
import type { TaskDrawingEditorHandle } from '@renderer/components/editor/TaskDrawingEditor'
import { parseNotes } from '@renderer/components/editor/notesFormat'
import type { NotesViewMode } from '@renderer/components/editor/notesLayout'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { toast } from '@renderer/components/ui/sonner'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { UNTITLED_PAGE } from './notebookUi'

export interface PageEditorHandle {
  flush: () => Promise<void>
}

interface PageEditorProps {
  pageId: number
  viewMode: NotesViewMode
  zenWidth: number
  onMaximize: () => void
  onZen: () => void
}

const TITLE_DEBOUNCE_MS = 500

// CURRENT_TIMESTAMP do SQLite é UTC sem fuso ("AAAA-MM-DD HH:MM:SS"); sem o Z vira hora local.
function fromSqlite(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z')
}

function formatStamp(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const PageEditor = forwardRef<PageEditorHandle, PageEditorProps>(function PageEditor(
  { pageId, viewMode, zenWidth, onMaximize, onZen },
  ref
) {
  const [page, setPage] = useState<NotebookPage | null>(null)
  const [missing, setMissing] = useState(false)
  const [title, setTitle] = useState('')
  const [editedAt, setEditedAt] = useState<Date | null>(null)
  const [tab, setTab] = usePersistedState<NotesTab>('ticktask.notebooks.tab', 'notes')
  const notesRef = useRef<TaskNotesEditorHandle>(null)
  const drawingRef = useRef<TaskDrawingEditorHandle>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTitle = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPage(null)
    setMissing(false)
    window.api
      .getPage(pageId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          setMissing(true)
          return
        }
        setPage(loaded)
        setTitle(loaded.title)
        setEditedAt(fromSqlite(loaded.updated_at))
      })
      .catch((e) => console.error('Falha ao abrir a página:', e))
    return () => {
      cancelled = true
    }
  }, [pageId])

  const saveTitle = useCallback(async (): Promise<void> => {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    const next = pendingTitle.current
    pendingTitle.current = null
    if (next === null) return
    await window.api.updatePageTitle(pageId, next)
    setEditedAt(new Date())
  }, [pageId])

  useEffect(
    () => () => {
      if (titleTimer.current) clearTimeout(titleTimer.current)
    },
    [pageId]
  )

  const handleTitleChange = (value: string): void => {
    setTitle(value)
    pendingTitle.current = value
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      saveTitle().catch((e) => console.error('Falha ao salvar o título:', e))
    }, TITLE_DEBOUNCE_MS)
  }

  const flush = useCallback(async (): Promise<void> => {
    await Promise.all([saveTitle(), notesRef.current?.flushSave(), drawingRef.current?.flushSave()])
  }, [saveTitle])

  useImperativeHandle(ref, () => ({ flush }), [flush])

  const [syncing, setSyncing] = useState(false)
  const handleExport = async (): Promise<void> => {
    try {
      await flush()
      const filePath = await window.api.exportPageLocal(pageId)
      if (filePath) toast.success(`Página exportada em ${filePath}`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleSync = async (): Promise<void> => {
    setSyncing(true)
    try {
      await flush()
      await window.api.syncNotebookPageToNotion(pageId)
    } catch (error) {
      // O aviso de erro já chega pelo evento notion:syncError.
      console.error('Falha ao sincronizar a página com o Notion:', error)
    } finally {
      setSyncing(false)
    }
  }

  const initialContent = useMemo(() => parseNotes(page?.notes), [page])
  const owner = useMemo(() => ({ kind: 'page' as const, id: pageId }), [pageId])
  const touch = useCallback(() => setEditedAt(new Date()), [])

  if (missing) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Página não encontrada.
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
      {viewMode === 'normal' && (
        <div className="shrink-0 px-6 pt-5 pb-3">
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            placeholder={UNTITLED_PAGE}
            className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400 font-mono">
            criada {formatStamp(fromSqlite(page.created_at))}
            {editedAt && ` · editada ${formatStamp(editedAt)}`}
          </p>
        </div>
      )}
      <div
        className={
          viewMode === 'zen' ? 'flex-1 min-h-0 flex justify-center pt-6' : 'flex-1 min-h-0 flex'
        }
      >
        <NotesPanel
          owner={owner}
          initialContent={initialContent}
          editorRef={notesRef}
          onChange={() => undefined}
          onSaved={touch}
          viewMode={viewMode}
          onMaximize={onMaximize}
          onZen={onZen}
          actions={
            <>
              <button
                onClick={() => void handleExport()}
                title="Exportar a página em Markdown"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Download size={13} />
                Exportar
              </button>
              <button
                onClick={() => void handleSync()}
                disabled={syncing}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar com o Notion'}
              </button>
            </>
          }
          zenWidth={zenWidth}
          tab={tab}
          onTabChange={setTab}
          initialDrawing={page.drawing}
          drawingRef={drawingRef}
          onDrawingChange={() => undefined}
          onDrawingSaved={touch}
        />
      </div>
    </div>
  )
})
