import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTask, updateTaskNotes } from '../../database'
import { markdownToProsemirror, type PMDoc } from '../../markdownToProsemirror'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { needsConfirmation } from '../confirmGuard'
import { afterTaskWrite } from '../effects'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

function parseDoc(raw: string | null | undefined): PMDoc | null {
  if (!raw) return null
  try {
    const doc = JSON.parse(raw) as PMDoc
    return doc && doc.type === 'doc' && Array.isArray(doc.content) ? doc : null
  } catch {
    return null
  }
}

export function registerNotesTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'read_notes',
    {
      title: 'Ler as notas de uma task',
      description: 'Devolve o corpo das notas de uma task convertido para Markdown.',
      inputSchema: { task_id: z.number().int().positive() }
    },
    async ({ task_id }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      return ok({ task_id, markdown: prosemirrorToMarkdown(task.notes) })
    }
  )

  server.registerTool(
    'write_notes',
    {
      title: 'Escrever nas notas de uma task',
      description:
        'Grava Markdown nas notas de uma task. Prefira mode=append: a conversão cobre parágrafo, títulos, listas, ênfases, código, citação e link, mas descarta menções @, destaques e tabelas do editor. mode=replace sobre uma nota não vazia apaga esse conteúdo e exige confirm_token.',
      inputSchema: {
        task_id: z.number().int().positive(),
        markdown: z.string().min(1),
        mode: z.enum(['append', 'replace']).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ task_id, markdown, mode, confirm_token }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      const effectiveMode = mode ?? 'append'
      const existing = parseDoc(task.notes)
      const incoming = markdownToProsemirror(markdown)
      const hasContent = (existing?.content.length ?? 0) > 0

      if (effectiveMode === 'replace' && hasContent) {
        if (needsConfirmation('replace_notes', 1, ctx.bulkThreshold)) {
          const operation = { kind: 'replace_notes', payload: { task_id, markdown } }
          if (!confirm_token) {
            return fail(
              'needs_confirmation',
              'Substituir apaga as notas atuais, incluindo menções, destaques e tabelas que o Markdown não representa. Mostre o conteúdo atual ao usuário antes de confirmar.',
              {
                confirm_token: ctx.confirmStore.issue(operation),
                current_markdown: prosemirrorToMarkdown(task.notes)
              }
            )
          }
          const consumed = ctx.confirmStore.consume(confirm_token, operation)
          if (!consumed.ok) return fail(consumed.code, consumed.message)
        }
      }

      const next: PMDoc =
        effectiveMode === 'append' && existing
          ? { type: 'doc', content: [...existing.content, ...incoming.content] }
          : incoming

      updateTaskNotes(task_id, JSON.stringify(next))
      afterTaskWrite(task_id)
      return ok({ task_id, mode: effectiveMode, blocks: next.content.length })
    }
  )
}
