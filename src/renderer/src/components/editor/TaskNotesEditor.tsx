import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { useNavigate } from 'react-router-dom'
import type { JSONContent } from '@tiptap/core'
import type { NotesOwner } from '@shared/types'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { GripVertical } from 'lucide-react'
import { buildExtensions } from './extensions'
import { BubbleToolbar } from './BubbleToolbar'
import { TableContextMenu } from './TableContextMenu'
import { saveOwnerNotes } from './notesOwner'
import { mentionRoute } from './mention/mentionRoute'

export interface TaskNotesEditorHandle {
  flushSave: () => Promise<void>
}

interface TaskNotesEditorProps {
  owner: NotesOwner
  initialContent: JSONContent
  onSaved?: (notes: string) => void
  onChange?: () => void
}

const DEBOUNCE_MS = 400

export const TaskNotesEditor = forwardRef<TaskNotesEditorHandle, TaskNotesEditorProps>(
  function TaskNotesEditor({ owner, initialContent, onSaved, onChange }, ref) {
    const { kind, id } = owner
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const onSavedRef = useRef(onSaved)
    onSavedRef.current = onSaved
    const navigate = useNavigate()
    const navigateRef = useRef(navigate)
    navigateRef.current = navigate

    const editor = useEditor(
      {
        extensions: buildExtensions({ kind, id }),
        content: initialContent,
        editorProps: {
          attributes: { class: 'notes-editor-content p-5 min-h-[200px] focus:outline-none' },
          handleClickOn: (view, _pos, node) => {
            if (node.type.name !== 'mention') return false
            const route = mentionRoute(node.attrs.entityType, node.attrs.id)
            if (!route) return false
            // Sair da tela desmonta o editor e descarta o save pendente do debounce.
            if (debounceRef.current) clearTimeout(debounceRef.current)
            const notes = JSON.stringify(view.state.doc.toJSON())
            saveOwnerNotes({ kind, id }, notes)
              .catch((e) => console.error('Falha ao salvar notas:', e))
              .finally(() => navigateRef.current(route))
            return true
          }
        },
        onUpdate: ({ editor }) => {
          onChangeRef.current?.()
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            const notes = JSON.stringify(editor.getJSON())
            saveOwnerNotes({ kind, id }, notes)
              .then(() => onSavedRef.current?.(notes))
              .catch((e) => console.error('Falha ao salvar notas:', e))
          }, DEBOUNCE_MS)
        }
      },
      [kind, id]
    )

    const persist = useCallback(async (): Promise<void> => {
      if (!editor) return
      const notes = JSON.stringify(editor.getJSON())
      await saveOwnerNotes({ kind, id }, notes)
      onSavedRef.current?.(notes)
    }, [editor, kind, id])

    useImperativeHandle(
      ref,
      () => ({
        flushSave: async () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          await persist()
        }
      }),
      [persist]
    )

    // Cancela um save pendente ao trocar de dono/desmontar, evitando que o
    // timeout dispare getJSON() sobre uma instância de editor já destruída.
    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }, [kind, id])

    return (
      <div className="text-slate-800">
        <BubbleToolbar editor={editor} />
        <TableContextMenu editor={editor} />
        {editor && (
          <DragHandle editor={editor}>
            <div className="flex cursor-grab items-center text-slate-400 hover:text-slate-600">
              <GripVertical size={16} />
            </div>
          </DragHandle>
        )}
        <EditorContent editor={editor} />
      </div>
    )
  }
)
