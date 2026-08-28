import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { GripVertical } from 'lucide-react'
import { buildExtensions } from './extensions'
import { BubbleToolbar } from './BubbleToolbar'
import { TableContextMenu } from './TableContextMenu'

export interface TaskNotesEditorHandle {
  flushSave: () => Promise<void>
}

interface TaskNotesEditorProps {
  taskId: number
  initialContent: JSONContent
  onSaved?: (notes: string) => void
  onChange?: () => void
}

const DEBOUNCE_MS = 400

export const TaskNotesEditor = forwardRef<TaskNotesEditorHandle, TaskNotesEditorProps>(
  function TaskNotesEditor({ taskId, initialContent, onSaved, onChange }, ref) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const onSavedRef = useRef(onSaved)
    onSavedRef.current = onSaved

    const editor = useEditor(
      {
        extensions: buildExtensions(taskId),
        content: initialContent,
        editorProps: {
          attributes: { class: 'notes-editor-content p-5 min-h-[200px] focus:outline-none' }
        },
        onUpdate: ({ editor }) => {
          onChangeRef.current?.()
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            const notes = JSON.stringify(editor.getJSON())
            window.api
              .updateTaskNotes(taskId, notes)
              .then(() => onSavedRef.current?.(notes))
              .catch((e) => console.error('Falha ao salvar notas:', e))
          }, DEBOUNCE_MS)
        }
      },
      [taskId]
    )

    const persist = useCallback(async (): Promise<void> => {
      if (!editor) return
      const notes = JSON.stringify(editor.getJSON())
      await window.api.updateTaskNotes(taskId, notes)
      onSavedRef.current?.(notes)
    }, [editor, taskId])

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

    // Cancela um save pendente ao trocar de task/desmontar, evitando que o
    // timeout dispare getJSON() sobre uma instância de editor já destruída.
    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }, [taskId])

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
