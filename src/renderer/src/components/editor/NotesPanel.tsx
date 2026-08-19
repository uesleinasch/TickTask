import type { ReactNode, Ref } from 'react'
import type { JSONContent } from '@tiptap/core'
import { Focus, Maximize2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { TaskNotesEditor, type TaskNotesEditorHandle } from './TaskNotesEditor'
import type { NotesViewMode } from './notesLayout'

interface NotesPanelProps {
  taskId: number
  initialContent: JSONContent
  editorRef: Ref<TaskNotesEditorHandle>
  onChange: () => void
  onSaved: () => void
  viewMode: NotesViewMode
  onMaximize: () => void
  onZen: () => void
  actions: ReactNode
  zenWidth: number
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
  zenWidth
}: NotesPanelProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col min-h-0 min-w-0',
        viewMode === 'zen' ? 'w-full flex-1' : 'flex-1'
      )}
      style={viewMode === 'zen' ? { maxWidth: zenWidth } : undefined}
    >
      {viewMode === 'normal' && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest shrink-0">
            Notas
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {actions}
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
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <TaskNotesEditor
          ref={editorRef}
          taskId={taskId}
          initialContent={initialContent}
          onChange={onChange}
          onSaved={onSaved}
        />
      </div>
    </div>
  )
}
