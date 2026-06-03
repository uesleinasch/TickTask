import { useEffect, useImperativeHandle, useRef, forwardRef, useCallback } from 'react'
import EditorJS, { type OutputData } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'
import Quote from '@editorjs/quote'
import Code from '@editorjs/code'
import Delimiter from '@editorjs/delimiter'
import Marker from '@editorjs/marker'
import InlineCode from '@editorjs/inline-code'

export interface TaskNotesEditorHandle {
  flushSave: () => Promise<void>
}

interface TaskNotesEditorProps {
  taskId: number
  initialData?: OutputData
  onSaved?: () => void
}

const DEBOUNCE_MS = 800

export const TaskNotesEditor = forwardRef<TaskNotesEditorHandle, TaskNotesEditorProps>(
  function TaskNotesEditor({ taskId, initialData, onSaved }, ref) {
    const holderRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorJS | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const persist = useCallback(async (): Promise<void> => {
      const editor = editorRef.current
      if (!editor) return
      const data = await editor.save()
      await window.api.updateTaskNotes(taskId, JSON.stringify(data))
      onSaved?.()
    }, [taskId, onSaved])

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

    useEffect(() => {
      if (!holderRef.current) return
      const editor = new EditorJS({
        holder: holderRef.current,
        autofocus: false,
        placeholder: 'Escreva suas anotações...',
        data: initialData,
        tools: {
          header: { class: Header as never, inlineToolbar: true },
          list: { class: List as never, inlineToolbar: true },
          checklist: { class: Checklist as never, inlineToolbar: true },
          quote: { class: Quote as never, inlineToolbar: true },
          code: Code as never,
          delimiter: Delimiter as never,
          marker: Marker as never,
          inlineCode: InlineCode as never
        },
        onChange: () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            persist().catch((e) => console.error('Falha ao salvar notas:', e))
          }, DEBOUNCE_MS)
        }
      })
      editorRef.current = editor

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        // destroy só após o editor estar pronto (evita erro no StrictMode double-mount)
        editor.isReady
          .then(() => {
            editor.destroy()
            editorRef.current = null
          })
          .catch(() => {})
      }
      // initialData só importa no mount; trocar de task remonta a página inteira
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId])

    return <div ref={holderRef} className="prose prose-sm max-w-none px-1" />
  }
)
