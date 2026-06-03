import { useEffect, useImperativeHandle, useRef, forwardRef, useCallback } from 'react'
import EditorJS, { type OutputData } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
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
  onChange?: () => void
}

// Salvamento local em tempo real (debounce curto).
const DEBOUNCE_MS = 400

export const TaskNotesEditor = forwardRef<TaskNotesEditorHandle, TaskNotesEditorProps>(
  function TaskNotesEditor({ taskId, initialData, onSaved, onChange }, ref) {
    // Wrapper estável controlado pelo React. O Editor.js é montado em um filho
    // criado a cada execução do efeito (ver useEffect) — isso evita que o destroy
    // assíncrono de uma instância (StrictMode double-mount) apague o DOM de outra.
    const wrapperRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorJS | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // mantém o onChange mais recente sem recriar o editor
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const persist = useCallback(async (): Promise<void> => {
      const editor = editorRef.current
      if (!editor) return
      await editor.isReady
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
      const wrapper = wrapperRef.current
      if (!wrapper) return

      // Holder dedicado a esta execução do efeito.
      const holder = document.createElement('div')
      wrapper.appendChild(holder)

      const editor = new EditorJS({
        holder,
        autofocus: false,
        placeholder: 'Escreva suas anotações...',
        data: initialData,
        tools: {
          header: {
            class: Header as never,
            inlineToolbar: true,
            config: { levels: [1, 2, 3], defaultLevel: 2 }
          },
          list: { class: List as never, inlineToolbar: true },
          quote: { class: Quote as never, inlineToolbar: true },
          code: Code as never,
          delimiter: Delimiter as never,
          marker: Marker as never,
          inlineCode: InlineCode as never
        },
        onChange: () => {
          onChangeRef.current?.()
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            persist().catch((e) => console.error('Falha ao salvar notas:', e))
          }, DEBOUNCE_MS)
        }
      })
      editorRef.current = editor

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        editor.isReady
          .then(() => {
            editor.destroy()
            // só remove o holder desta instância; nunca o de outra
            holder.remove()
            if (editorRef.current === editor) editorRef.current = null
          })
          .catch(() => {
            holder.remove()
          })
      }
      // initialData é capturado no mount; trocar de task remonta com novo holder
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId])

    return <div ref={wrapperRef} className="notes-editor-content p-5 min-h-[200px] text-slate-800" />
  }
)
