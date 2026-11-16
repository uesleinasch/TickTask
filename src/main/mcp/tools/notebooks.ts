import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { UNTITLED_PAGE, flattenPageTree } from '@shared/notebookTree'
import { notebookDb } from '../../database'
import {
  createPage,
  deletePage,
  getNotebook,
  getPage,
  getSection,
  listNotebooks,
  listPageSubtree,
  listPages,
  listSections,
  searchPages,
  updatePageNotes
} from '../../notebookQueries'
import {
  afterNotebookStructureChange,
  autoSyncNotebook,
  removeNotebookNode
} from '../../notebookService'
import { readDrawingPreview } from '../../drawingAssets'
import { markdownToProsemirror, type PMDoc } from '../../markdownToProsemirror'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { needsConfirmation } from '../confirmGuard'
import { fail, ok, okImage } from '../reply'
import type { ToolContext } from '../toolContext'
import { hasRealContent, parseNotes } from './notes'
import { describeElements } from './drawing'

function pageTree(sectionId: number): { id: number; title: string; depth: number }[] {
  return flattenPageTree(listPages(notebookDb(), sectionId)).map(({ page, depth }) => ({
    id: page.id,
    title: page.title || UNTITLED_PAGE,
    depth
  }))
}

export function registerNotebookTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'list_notebooks',
    {
      title: 'Listar cadernos',
      description:
        'Cadernos, seções e páginas (com subpáginas, em ordem de árvore; depth 0 a 2). Passe notebook_id para listar só um caderno.',
      inputSchema: { notebook_id: z.number().int().positive().optional() }
    },
    async ({ notebook_id }) => {
      const db = notebookDb()
      const notebooks = notebook_id
        ? [getNotebook(db, notebook_id)].filter((n) => n !== undefined)
        : listNotebooks(db)
      if (notebook_id && notebooks.length === 0) {
        return fail('not_found', `Caderno ${notebook_id} não existe.`)
      }
      return ok({
        notebooks: notebooks.map((n) => ({
          id: n.id,
          name: n.name,
          sections: listSections(db, n.id).map((s) => ({
            id: s.id,
            name: s.name,
            pages: pageTree(s.id)
          }))
        }))
      })
    }
  )

  server.registerTool(
    'search_pages',
    {
      title: 'Buscar páginas de caderno',
      description:
        'Busca páginas pelo título e pelo texto das notas. Devolve até 30, com um trecho.',
      inputSchema: { query: z.string().min(1) }
    },
    async ({ query }) => ok({ results: searchPages(notebookDb(), query) })
  )

  server.registerTool(
    'read_page',
    {
      title: 'Ler uma página de caderno',
      description:
        'Devolve a página em Markdown, com caderno, seção e subpáginas. Se a página tem desenho, a imagem PNG vem junto.',
      inputSchema: { page_id: z.number().int().positive() }
    },
    async ({ page_id }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)
      const section = getSection(db, page.section_id)
      const notebook = section ? getNotebook(db, section.notebook_id) : undefined
      const parsed = parseNotes(page.notes)
      const drawing = describeElements(page.drawing)
      const data = {
        page_id,
        title: page.title || UNTITLED_PAGE,
        notebook: notebook ? { id: notebook.id, name: notebook.name } : null,
        section: section ? { id: section.id, name: section.name } : null,
        parent_page_id: page.parent_page_id,
        subpage_ids: listPageSubtree(db, page_id).slice(1),
        updated_at: page.updated_at,
        markdown:
          parsed.kind === 'doc' || parsed.kind === 'empty'
            ? prosemirrorToMarkdown(page.notes)
            : null,
        drawing: { elements: drawing.count, kinds: drawing.kinds, texts: drawing.texts }
      }
      if (drawing.count === 0) return ok(data)
      const png = await readDrawingPreview({ kind: 'page', id: page_id })
      return png ? okImage(png.toString('base64'), 'image/png', data) : ok(data)
    }
  )

  server.registerTool(
    'create_page',
    {
      title: 'Criar página de caderno',
      description:
        'Cria uma página numa seção (ids em list_notebooks), opcionalmente como subpágina (até 2 níveis) e já com conteúdo em Markdown.',
      inputSchema: {
        section_id: z.number().int().positive(),
        title: z.string().optional(),
        parent_page_id: z.number().int().positive().optional(),
        markdown: z.string().optional()
      }
    },
    async ({ section_id, title, parent_page_id, markdown }) => {
      const db = notebookDb()
      let page
      try {
        page = createPage(db, { section_id, title, parent_page_id: parent_page_id ?? null })
      } catch (error) {
        return fail('validation', error instanceof Error ? error.message : String(error))
      }
      if (markdown) updatePageNotes(db, page.id, JSON.stringify(markdownToProsemirror(markdown)))
      afterNotebookStructureChange({ kind: 'page', id: page.id })
      return ok({ page_id: page.id, section_id, parent_page_id: page.parent_page_id })
    }
  )

  server.registerTool(
    'write_page',
    {
      title: 'Escrever numa página de caderno',
      description:
        'Grava Markdown nas notas de uma página. Mesma conversão e mesmas perdas de write_notes (menções, destaques, tabelas, checklist e imagens não sobrevivem). Prefira mode=append; mode=replace sobre página com conteúdo exige confirm_token.',
      inputSchema: {
        page_id: z.number().int().positive(),
        markdown: z.string().min(1),
        mode: z.enum(['append', 'replace']).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ page_id, markdown, mode, confirm_token }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)

      const effectiveMode = mode ?? 'append'
      const parsed = parseNotes(page.notes)
      const incoming = markdownToProsemirror(markdown)
      const destructive = effectiveMode === 'replace' || parsed.kind !== 'doc'

      if (
        hasRealContent(parsed) &&
        destructive &&
        needsConfirmation('replace_notes', 1, ctx.bulkThreshold)
      ) {
        const operation = { kind: 'replace_page_notes', payload: { page_id, markdown } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            'Substituir apaga as notas atuais da página, incluindo o que o Markdown não representa. Mostre o conteúdo atual ao usuário antes de confirmar.',
            {
              confirm_token: ctx.confirmStore.issue(operation),
              current_markdown: parsed.kind === 'doc' ? prosemirrorToMarkdown(page.notes) : null
            }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      const next: PMDoc =
        effectiveMode === 'append' && parsed.kind === 'doc'
          ? { type: 'doc', content: [...parsed.doc.content, ...incoming.content] }
          : incoming
      updatePageNotes(db, page_id, JSON.stringify(next))
      autoSyncNotebook({ kind: 'page', id: page_id })
      return ok({ page_id, mode: effectiveMode, blocks: next.content.length })
    }
  )

  server.registerTool(
    'delete_page',
    {
      title: 'Excluir página de caderno',
      description:
        'Apaga a página e as subpáginas dela, para sempre. Sempre exige confirm_token: a primeira chamada devolve o que será apagado.',
      inputSchema: {
        page_id: z.number().int().positive(),
        confirm_token: z.string().optional()
      }
    },
    async ({ page_id, confirm_token }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)

      const ids = listPageSubtree(db, page_id)
      const operation = { kind: 'delete_pages', payload: { page_id } }
      if (needsConfirmation('delete_pages', ids.length, ctx.bulkThreshold)) {
        if (!confirm_token) {
          return fail('needs_confirmation', 'Confirme com o usuário antes de apagar.', {
            confirm_token: ctx.confirmStore.issue(operation),
            preview: ids.map((id) => ({ id, title: getPage(db, id)?.title || UNTITLED_PAGE }))
          })
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      const deleted = await removeNotebookNode('page', page_id, (id) => deletePage(db, id))
      return ok({ deleted })
    }
  )
}
