import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTask } from '../../database'
import { readDrawingPreview } from '../../drawingAssets'
import { fail, ok, okImage } from '../reply'

interface DrawingElement {
  type?: string
  text?: string
}

function describeElements(raw: string | null | undefined): {
  count: number
  kinds: Record<string, number>
  texts: string[]
} {
  const empty = { count: 0, kinds: {}, texts: [] }
  if (!raw) return empty

  try {
    const parsed = JSON.parse(raw) as { elements?: DrawingElement[] }
    const elements = Array.isArray(parsed.elements) ? parsed.elements : []
    const kinds: Record<string, number> = {}
    const texts: string[] = []
    for (const el of elements) {
      const kind = el.type ?? 'desconhecido'
      kinds[kind] = (kinds[kind] ?? 0) + 1
      if (typeof el.text === 'string' && el.text.trim().length > 0) texts.push(el.text.trim())
    }
    return { count: elements.length, kinds, texts }
  } catch {
    return empty
  }
}

export function registerDrawingTools(server: McpServer): void {
  server.registerTool(
    'read_drawing',
    {
      title: 'Ver o desenho de uma task',
      description:
        'Devolve o desenho (Excalidraw) de uma task como imagem PNG, junto com um resumo dos elementos.',
      inputSchema: { task_id: z.number().int().positive() }
    },
    async ({ task_id }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      const summary = describeElements(task.drawing)
      if (summary.count === 0) {
        return ok({ task_id, has_drawing: false, message: 'Esta task não tem desenho.' })
      }

      const png = await readDrawingPreview(task_id)
      if (!png) {
        return ok({
          task_id,
          has_drawing: true,
          image: null,
          ...summary,
          message:
            'O desenho existe, mas a imagem ainda não foi gerada. Abra a aba Desenho da task no app para gerá-la.'
        })
      }

      return okImage(png.toString('base64'), 'image/png', {
        task_id,
        has_drawing: true,
        elements: summary.count,
        kinds: summary.kinds,
        texts: summary.texts
      })
    }
  )
}
