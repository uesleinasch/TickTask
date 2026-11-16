import { dialog, ipcMain, type BrowserWindow } from 'electron'
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
  getPage,
  listNotebooks,
  listPages,
  listSections,
  locatePage,
  movePage,
  reorderNotebooks,
  reorderSections,
  searchPages,
  updateNotebook,
  updatePageDrawing,
  updatePageNotes,
  updatePageTitle,
  updateSection
} from './notebookQueries'
import { deleteDrawingPreview, saveDrawingPreview } from './drawingAssets'
import { defaultPageFileName, exportNotebookToDir, exportPageToFile } from './notebookExport'
import {
  afterNotebookStructureChange,
  afterPageMoved,
  autoSyncNotebook,
  initNotebookService,
  refreshNotebooks,
  removeNotebookNode,
  syncNotebookNow
} from './notebookService'

export function registerNotebookIpc(getWindow: () => BrowserWindow | null): void {
  initNotebookService(getWindow)

  ipcMain.handle('notebook:list', () => listNotebooks(notebookDb()))
  ipcMain.handle('notebook:create', (_, input: CreateNotebookInput) => {
    const notebook = createNotebook(notebookDb(), input)
    afterNotebookStructureChange({ kind: 'notebook', id: notebook.id })
    return notebook
  })
  ipcMain.handle('notebook:update', (_, id: number, input: UpdateNotebookInput) => {
    updateNotebook(notebookDb(), id, input)
    afterNotebookStructureChange({ kind: 'notebook', id })
  })
  ipcMain.handle('notebook:delete', async (_, id: number) => {
    await removeNotebookNode('notebook', id, (nbId) => deleteNotebook(notebookDb(), nbId))
  })
  ipcMain.handle('notebook:reorder', (_, ids: number[]) => {
    reorderNotebooks(notebookDb(), ids)
    refreshNotebooks()
  })

  ipcMain.handle('section:list', (_, notebookId: number) => listSections(notebookDb(), notebookId))
  ipcMain.handle('section:create', (_, input: CreateSectionInput) => {
    const section = createSection(notebookDb(), input)
    afterNotebookStructureChange({ kind: 'section', id: section.id })
    return section
  })
  ipcMain.handle('section:update', (_, id: number, input: UpdateSectionInput) => {
    updateSection(notebookDb(), id, input)
    afterNotebookStructureChange({ kind: 'section', id })
  })
  ipcMain.handle('section:delete', async (_, id: number) => {
    await removeNotebookNode('section', id, (sectionId) => deleteSection(notebookDb(), sectionId))
  })
  ipcMain.handle('section:reorder', (_, notebookId: number, ids: number[]) => {
    reorderSections(notebookDb(), notebookId, ids)
    refreshNotebooks()
  })

  ipcMain.handle('page:list', (_, sectionId: number) => listPages(notebookDb(), sectionId))
  ipcMain.handle('page:get', (_, id: number) => getPage(notebookDb(), id) ?? null)
  ipcMain.handle('page:search', (_, query: string) => searchPages(notebookDb(), query))
  ipcMain.handle('page:locate', (_, id: number) => locatePage(notebookDb(), id))
  ipcMain.handle('page:create', (_, input: CreatePageInput) => {
    const page = createPage(notebookDb(), input)
    afterNotebookStructureChange({ kind: 'page', id: page.id })
    return page
  })
  ipcMain.handle('page:updateTitle', (_, id: number, title: string) => {
    updatePageTitle(notebookDb(), id, title)
    afterNotebookStructureChange({ kind: 'page', id })
  })
  ipcMain.handle('page:delete', async (_, id: number) => {
    await removeNotebookNode('page', id, (pageId) => deletePage(notebookDb(), pageId))
  })
  ipcMain.handle('page:move', (_, id: number, input: MovePageInput) => {
    movePage(notebookDb(), id, input)
    afterPageMoved(id)
  })
  ipcMain.handle('page:saveNotes', (_, id: number, notes: string | null) => {
    updatePageNotes(notebookDb(), id, notes)
    autoSyncNotebook({ kind: 'page', id })
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
      autoSyncNotebook({ kind: 'page', id })
    }
  )

  ipcMain.handle('page:exportLocal', async (_, id: number) => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar página',
      defaultPath: defaultPageFileName(id),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    await exportPageToFile(id, result.filePath)
    return result.filePath
  })
  ipcMain.handle('notebook:exportLocal', async (_, id: number) => {
    const result = await dialog.showOpenDialog({
      title: 'Escolha a pasta para exportar o caderno',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return exportNotebookToDir(id, result.filePaths[0])
  })

  ipcMain.handle('notion:syncNotebookPage', (_, id: number) =>
    syncNotebookNow({ kind: 'page', id })
  )
  ipcMain.handle('notion:syncNotebook', (_, id: number) => syncNotebookNow({ kind: 'tree', id }))
}
