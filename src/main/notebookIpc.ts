import { ipcMain, type BrowserWindow } from 'electron'
import type {
  CreateNotebookInput,
  CreatePageInput,
  CreateSectionInput,
  MovePageInput,
  UpdateNotebookInput,
  UpdateSectionInput
} from '@shared/types'
import { notebookDb } from './database'
import {
  createNotebook,
  createPage,
  createSection,
  deleteNotebook,
  deletePage,
  deleteSection,
  getNotionPageId,
  getPage,
  listNotebooks,
  listPageSubtree,
  listPages,
  listSections,
  movePage,
  reorderNotebooks,
  reorderSections,
  updateNotebook,
  updatePageDrawing,
  updatePageNotes,
  updatePageTitle,
  updateSection,
  type NotebookNodeKind
} from './notebookQueries'
import { deleteDrawingPreview, saveDrawingPreview } from './drawingAssets'
import { createDebouncedSerialQueue } from './debouncedSerialQueue'
import {
  archiveNotionPage,
  isNotebookAutoSyncOn,
  notebookSyncLabel,
  syncNotebookTarget,
  type NotebookSyncTarget
} from './notionNotebooks'

const NOTION_SYNC_DELAY_MS = 3000

async function deletePagePreviews(pageIds: number[]): Promise<void> {
  await Promise.all(pageIds.map((id) => deleteDrawingPreview({ kind: 'page', id })))
}

export function registerNotebookIpc(getWindow: () => BrowserWindow | null): void {
  const send = (channel: string, ...args: unknown[]): void =>
    getWindow()?.webContents.send(channel, ...args)
  const refresh = (): void => send('notebooks:refresh')
  const queue = createDebouncedSerialQueue(NOTION_SYNC_DELAY_MS)

  const runSync = (target: NotebookSyncTarget) => async (): Promise<void> => {
    const label = notebookSyncLabel(target)
    if (label === null) return
    send('notion:syncStart', label)
    try {
      await syncNotebookTarget(target)
      send('notion:syncSuccess', label)
    } catch (error) {
      console.error('Erro ao sincronizar caderno com o Notion:', error)
      send('notion:syncError', error instanceof Error ? error.message : 'Erro desconhecido')
      throw error
    }
  }
  const keyOf = (target: NotebookSyncTarget): string => `${target.kind}:${target.id}`
  const autoSync = (...targets: NotebookSyncTarget[]): void => {
    if (!isNotebookAutoSyncOn()) return
    for (const target of targets) queue.schedule(keyOf(target), runSync(target))
  }
  const syncNow = (target: NotebookSyncTarget): Promise<void> =>
    queue.now(keyOf(target), runSync(target))

  // Arquivar o nó de cima arquiva tudo abaixo dele no Notion.
  const remove =
    (kind: NotebookNodeKind, fn: (id: number) => number[]) => async (_: unknown, id: number) => {
      const notionId = getNotionPageId(notebookDb(), kind, id)
      const pageIds = fn(id)
      refresh()
      if (notionId && isNotebookAutoSyncOn()) {
        queue.now(`archive:${notionId}`, () => archiveNotionPage(notionId)).catch(() => undefined)
      }
      await deletePagePreviews(pageIds)
    }

  ipcMain.handle('notebook:list', () => listNotebooks(notebookDb()))
  ipcMain.handle('notebook:create', (_, input: CreateNotebookInput) => {
    const notebook = createNotebook(notebookDb(), input)
    refresh()
    autoSync({ kind: 'notebook', id: notebook.id })
    return notebook
  })
  ipcMain.handle('notebook:update', (_, id: number, input: UpdateNotebookInput) => {
    updateNotebook(notebookDb(), id, input)
    refresh()
    autoSync({ kind: 'notebook', id })
  })
  ipcMain.handle(
    'notebook:delete',
    remove('notebook', (id) => deleteNotebook(notebookDb(), id))
  )
  ipcMain.handle('notebook:reorder', (_, ids: number[]) => {
    reorderNotebooks(notebookDb(), ids)
    refresh()
  })

  ipcMain.handle('section:list', (_, notebookId: number) => listSections(notebookDb(), notebookId))
  ipcMain.handle('section:create', (_, input: CreateSectionInput) => {
    const section = createSection(notebookDb(), input)
    refresh()
    autoSync({ kind: 'section', id: section.id })
    return section
  })
  ipcMain.handle('section:update', (_, id: number, input: UpdateSectionInput) => {
    updateSection(notebookDb(), id, input)
    refresh()
    autoSync({ kind: 'section', id })
  })
  ipcMain.handle(
    'section:delete',
    remove('section', (id) => deleteSection(notebookDb(), id))
  )
  ipcMain.handle('section:reorder', (_, notebookId: number, ids: number[]) => {
    reorderSections(notebookDb(), notebookId, ids)
    refresh()
  })

  ipcMain.handle('page:list', (_, sectionId: number) => listPages(notebookDb(), sectionId))
  ipcMain.handle('page:get', (_, id: number) => getPage(notebookDb(), id) ?? null)
  ipcMain.handle('page:create', (_, input: CreatePageInput) => {
    const page = createPage(notebookDb(), input)
    refresh()
    autoSync({ kind: 'page', id: page.id })
    return page
  })
  ipcMain.handle('page:updateTitle', (_, id: number, title: string) => {
    updatePageTitle(notebookDb(), id, title)
    refresh()
    autoSync({ kind: 'page', id })
  })
  ipcMain.handle(
    'page:delete',
    remove('page', (id) => deletePage(notebookDb(), id))
  )
  ipcMain.handle('page:move', (_, id: number, input: MovePageInput) => {
    movePage(notebookDb(), id, input)
    refresh()
    autoSync(
      ...listPageSubtree(notebookDb(), id).map((pageId) => ({ kind: 'page' as const, id: pageId }))
    )
  })
  ipcMain.handle('page:saveNotes', (_, id: number, notes: string | null) => {
    updatePageNotes(notebookDb(), id, notes)
    autoSync({ kind: 'page', id })
  })
  // Mesma regra do drawing:save da task: o PNG é gravado junto do JSON para as saídas derivadas
  // (Notion, export, MCP) não servirem um preview defasado.
  ipcMain.handle(
    'page:saveDrawing',
    async (_, id: number, drawing: string | null, preview: Uint8Array | null) => {
      const owner = { kind: 'page', id } as const
      if (drawing === null) {
        updatePageDrawing(notebookDb(), id, null)
        await deleteDrawingPreview(owner)
      } else {
        if (preview) await saveDrawingPreview(owner, preview)
        updatePageDrawing(notebookDb(), id, drawing)
      }
      autoSync({ kind: 'page', id })
    }
  )

  ipcMain.handle('notion:syncNotebookPage', (_, id: number) => syncNow({ kind: 'page', id }))
  ipcMain.handle('notion:syncNotebook', (_, id: number) => syncNow({ kind: 'tree', id }))
}
