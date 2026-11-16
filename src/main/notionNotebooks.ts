import type { Client } from '@notionhq/client'
import { UNTITLED_PAGE } from '@shared/notebookTree'
import { notebookDb } from './database'
import {
  getNotebook,
  getNotionPageId,
  getPage,
  getSection,
  listNotebookPageIds,
  listSections,
  setNotionPageId,
  type NotebookNodeKind
} from './notebookQueries'
import {
  findAccessibleParentPage,
  getNotionClient,
  getNotionConfig,
  isPageAccessible,
  replacePageBody,
  saveNotionConfig
} from './notion'
import {
  NOTEBOOKS_ROOT_TITLE,
  planPageTarget,
  sameNotionId,
  titleProperty,
  type RemotePage
} from './notionNotebookPlan'

const ICONS = { root: '📚', notebook: '📓', section: '📑', page: '📄' } as const

interface EnsuredPage {
  id: string
  created: boolean
}

export function isNotebookAutoSyncOn(): boolean {
  const config = getNotionConfig()
  return !!config?.apiKey && config.autoSync
}

async function retrieve(client: Client, pageId: string): Promise<RemotePage | null> {
  try {
    const page = await client.pages.retrieve({ page_id: pageId })
    if (!('parent' in page)) return null
    return {
      archived: page.archived || page.in_trash,
      parentId: page.parent.type === 'page_id' ? page.parent.page_id : null
    }
  } catch {
    return null
  }
}

export async function archiveNotionPage(pageId: string): Promise<void> {
  try {
    await getNotionClient().pages.update({ page_id: pageId, archived: true })
  } catch (error) {
    console.error('Erro ao arquivar página no Notion:', error)
  }
}

async function findRootBySearch(client: Client, parentId: string): Promise<string | null> {
  const res = await client.search({
    query: NOTEBOOKS_ROOT_TITLE,
    filter: { property: 'object', value: 'page' }
  })
  for (const result of res.results) {
    if (!('parent' in result) || result.object !== 'page') continue
    if (result.archived || result.in_trash) continue
    if (result.parent.type !== 'page_id' || !sameNotionId(result.parent.page_id, parentId)) continue
    const title = Object.values(result.properties).find((p) => p.type === 'title')
    const text = title?.type === 'title' ? title.title.map((t) => t.plain_text).join('') : ''
    if (text === NOTEBOOKS_ROOT_TITLE) return result.id
  }
  return null
}

/**
 * A raiz fica guardada na config. Se a config perdeu o id (outros caminhos regravam a config sem
 * esse campo), procura uma raiz existente antes de criar outra.
 */
async function ensureRoot(client: Client): Promise<string> {
  const config = getNotionConfig()
  if (!config?.apiKey) throw new Error('Notion não está configurado.')

  if (config.notebooksRootPageId) {
    const remote = await retrieve(client, config.notebooksRootPageId)
    if (remote && !remote.archived) return config.notebooksRootPageId
  }

  const parentId =
    config.pageId && (await isPageAccessible(client, config.pageId))
      ? config.pageId
      : await findAccessibleParentPage(client)

  let rootId = await findRootBySearch(client, parentId)
  if (!rootId) {
    const created = await client.pages.create({
      parent: { page_id: parentId },
      icon: { type: 'emoji', emoji: ICONS.root },
      properties: { title: titleProperty(NOTEBOOKS_ROOT_TITLE, NOTEBOOKS_ROOT_TITLE) }
    })
    rootId = created.id
  }
  saveNotionConfig({ ...(getNotionConfig() ?? config), notebooksRootPageId: rootId })
  return rootId
}

async function ensureChild(
  client: Client,
  kind: NotebookNodeKind,
  id: number,
  title: string,
  parentId: string,
  updateTitle: boolean
): Promise<EnsuredPage> {
  const db = notebookDb()
  const current = getNotionPageId(db, kind, id)
  const remote = current ? await retrieve(client, current) : null
  const action = planPageTarget(remote, parentId)
  const properties = { title: titleProperty(title, UNTITLED_PAGE) }

  if (action === 'update' && current) {
    if (updateTitle) await client.pages.update({ page_id: current, properties })
    return { id: current, created: false }
  }
  if (action === 'recreate' && current) await archiveNotionPage(current)

  const created = await client.pages.create({
    parent: { page_id: parentId },
    icon: { type: 'emoji', emoji: ICONS[kind] },
    properties
  })
  setNotionPageId(db, kind, id, created.id)
  return { id: created.id, created: true }
}

async function ensureNotebook(
  client: Client,
  id: number,
  updateTitle: boolean
): Promise<EnsuredPage> {
  const notebook = getNotebook(notebookDb(), id)
  if (!notebook) throw new Error('Caderno não encontrado.')
  const rootId = await ensureRoot(client)
  return ensureChild(client, 'notebook', id, notebook.name, rootId, updateTitle)
}

async function ensureSection(
  client: Client,
  id: number,
  updateTitle: boolean
): Promise<EnsuredPage> {
  const section = getSection(notebookDb(), id)
  if (!section) throw new Error('Seção não encontrada.')
  const parent = await ensureNotebook(client, section.notebook_id, false)
  return ensureChild(client, 'section', id, section.name, parent.id, updateTitle)
}

/**
 * Garante os ancestrais sem reescrever o título deles (isso é trabalho do sync de cada um). O corpo
 * só é reescrito na página alvo — ou num ancestral que acabou de ser (re)criado e nasceu vazio.
 */
async function ensurePage(client: Client, id: number, withBody: boolean): Promise<EnsuredPage> {
  const page = getPage(notebookDb(), id)
  if (!page) throw new Error('Página não encontrada.')
  const parent =
    page.parent_page_id !== null
      ? await ensurePage(client, page.parent_page_id, false)
      : await ensureSection(client, page.section_id, false)
  const ensured = await ensureChild(client, 'page', id, page.title, parent.id, withBody)
  if (withBody || ensured.created) {
    await replacePageBody(client, ensured.id, { kind: 'page', id }, page.notes, page.drawing)
  }
  return ensured
}

export interface NotebookSyncTarget {
  kind: NotebookNodeKind | 'tree'
  id: number
}

/** Nome mostrado no aviso de sync; null quando o item já não existe e não há o que sincronizar. */
export function notebookSyncLabel(target: NotebookSyncTarget): string | null {
  const db = notebookDb()
  switch (target.kind) {
    case 'notebook':
    case 'tree':
      return getNotebook(db, target.id)?.name ?? null
    case 'section':
      return getSection(db, target.id)?.name ?? null
    case 'page': {
      const page = getPage(db, target.id)
      return page ? page.title || UNTITLED_PAGE : null
    }
  }
}

export async function syncNotebookTarget(target: NotebookSyncTarget): Promise<void> {
  const client = getNotionClient()
  switch (target.kind) {
    case 'notebook':
      await ensureNotebook(client, target.id, true)
      return
    case 'section':
      await ensureSection(client, target.id, true)
      return
    case 'page':
      await ensurePage(client, target.id, true)
      return
    case 'tree': {
      const db = notebookDb()
      await ensureNotebook(client, target.id, true)
      for (const section of listSections(db, target.id)) {
        await ensureSection(client, section.id, true)
      }
      for (const pageId of listNotebookPageIds(db, target.id)) {
        await ensurePage(client, pageId, true)
      }
    }
  }
}
