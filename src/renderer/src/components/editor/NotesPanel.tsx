import { Suspense, lazy, type ReactNode, type Ref } from 'react'
import type { JSONContent } from '@tiptap/core'
import { Focus, Loader2, Maximize2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { TaskNotesEditor, type TaskNotesEditorHandle } from './TaskNotesEditor'
import type { TaskDrawingEditorHandle } from './TaskDrawingEditor'
import type { NotesViewMode } from './notesLayout'

// O Excalidraw acrescenta alguns MB ao bundle; carregar só quando a aba abre mantém o boot das
// outras telas fora dessa conta.
const TaskDrawingEditor = lazy(() =>
  import('./TaskDrawingEditor').then((m) => ({ default: m.TaskDrawingEditor }))
)

export type NotesTab = 'notes' | 'drawing'

interface NotesPanelProps {
  taskId: number
  initialContent: JSONContent
  editorRef: Ref<TaskNotesEditorHandle>
  onChange: () => void
  onSaved: (notes: string) => void
  viewMode: NotesViewMode
  onMaximize: () => void
  onZen: () => void
  actions: ReactNode
  zenWidth: number
  tab: NotesTab
  onTabChange: (tab: NotesTab) => void
  initialDrawing: string | null
  drawingRef: Ref<TaskDrawingEditorHandle>
  onDrawingChange: () => void
  onDrawingSaved: (drawing: string) => void
}

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs font-semibold uppercase tracking-widest transition-colors',
        active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
      )}
    >
      {label}
    </button>
  )
}

export function NotesPanel({
  taskId,
  initialContent,
  editorRef,
  onChange,
  onSaved,
  viewMode,
  onMaximize,
  onZen,
  actions,
  zenWidth,
  tab,
  onTabChange,
  initialDrawing,
  drawingRef,
  onDrawingChange,
  onDrawingSaved
}: NotesPanelProps): React.JSX.Element {
  // No zen, a nota é centralizada numa coluna de leitura; o desenho quer o oposto — a tela
  // inteira —, então a limitação de largura não se aplica a ele.
  const zenLimited = viewMode === 'zen' && tab === 'notes'

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 min-w-0',
        viewMode === 'zen' ? 'w-full flex-1' : 'flex-1'
      )}
      style={zenLimited ? { maxWidth: zenWidth } : undefined}
    >
      {viewMode === 'normal' && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <TabButton
              active={tab === 'notes'}
              label="Notas"
              onClick={() => onTabChange('notes')}
            />
            <TabButton
              active={tab === 'drawing'}
              label="Desenho"
              onClick={() => onTabChange('drawing')}
            />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {tab === 'notes' && actions}
            <button
              onClick={onZen}
              title="Modo Zen — só o editor (Esc para sair)"
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
            >
              <Focus size={14} />
            </button>
            <button
              onClick={onMaximize}
              title="Maximizar a área de texto (Esc para sair)"
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      )}
      {tab === 'notes' ? (
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <TaskNotesEditor
            ref={editorRef}
            taskId={taskId}
            initialContent={initialContent}
            onChange={onChange}
            onSaved={onSaved}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            }
          >
            <TaskDrawingEditor
              ref={drawingRef}
              taskId={taskId}
              initialDrawing={initialDrawing}
              onChange={onDrawingChange}
              onSaved={onDrawingSaved}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
