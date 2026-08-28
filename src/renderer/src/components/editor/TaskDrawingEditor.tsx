import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { ensureExcalidrawAssetPath } from './drawingAssetPath'
import '@excalidraw/excalidraw/index.css'

ensureExcalidrawAssetPath()

export interface TaskDrawingEditorHandle {
  flushSave: () => Promise<void>
}

interface TaskDrawingEditorProps {
  taskId: number
  initialDrawing: string | null
  onChange?: () => void
  onSaved?: (drawing: string) => void
}

const DEBOUNCE_MS = 800

interface StoredDrawing {
  elements: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

function parseDrawing(raw: string | null): StoredDrawing | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredDrawing
    return Array.isArray(parsed.elements) ? parsed : null
  } catch {
    return null
  }
}

export const TaskDrawingEditor = forwardRef<TaskDrawingEditorHandle, TaskDrawingEditorProps>(
  function TaskDrawingEditor({ taskId, initialDrawing, onChange, onSaved }, ref) {
    const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const onSavedRef = useRef(onSaved)
    onSavedRef.current = onSaved
    const [stored] = useState(() => parseDrawing(initialDrawing))

    const persist = useCallback(async (): Promise<void> => {
      const api = apiRef.current
      if (!api) return

      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files = api.getFiles()
      const drawing = JSON.stringify({
        elements,
        // appState inteiro carrega estado volátil (cursor, seleção, collaborators) que não
        // interessa persistir e chega a conter referências não serializáveis.
        appState: { viewBackgroundColor: appState.viewBackgroundColor },
        files
      })

      let preview: Uint8Array | null = null
      if (elements.length > 0) {
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportBackground: true },
          files,
          mimeType: 'image/png',
          exportPadding: 16
        })
        preview = new Uint8Array(await blob.arrayBuffer())
      }

      await window.api.saveDrawing(taskId, drawing, preview)
      onSavedRef.current?.(drawing)
    }, [taskId])

    const handleChange = useCallback((): void => {
      onChangeRef.current?.()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        persist().catch((e) => console.error('Falha ao salvar o desenho:', e))
      }, DEBOUNCE_MS)
    }, [persist])

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
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }, [taskId])

    return (
      <div className="h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api
          }}
          initialData={
            stored
              ? { elements: stored.elements as never, appState: stored.appState as never }
              : null
          }
          onChange={handleChange}
          langCode="pt-BR"
        />
      </div>
    )
  }
)
