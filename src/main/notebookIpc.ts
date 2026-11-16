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
  getPage,
  listNotebooks,
  listPages,
  listSections,
  movePage,
  reorderNotebooks,
  reorderSections,
  updateNotebook,
  updatePageDrawing,
  updatePageNotes,
  updatePageTitle,
  updateSection
} from './notebookQueries'
import { deleteDrawingPreview, saveDrawingPreview } from './drawingAssets'

async function deletePagePreviews(pageIds: number[]): Promise<void> {
  await Promise.all(pageIds.map((id) => deleteDrawingPreview({ kind: 'page', id })))
}

export function registerNotebookIpc(getWindow: () => BrowserWindow | null): void {
  const refresh = (): void => getWindow()?.webContents.send('notebooks:refresh')
  const mutate =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (_: unknown, ...args: A): R => {
      const result = fn(...args)
      refresh()
      return result
    }
  const remove = (fn: (id: number) => number[]) => async (_: unknown, id: number) => {
    const pageIds = fn(id)
    refresh()
    await deletePagePreviews(pageIds)
  }

  ipcMain.handle('notebook:list', () => listNotebooks(notebookDb()))
  ipcMain.handle(
    'notebook:create',
    mutate((input: CreateNotebookInput) => createNotebook(notebookDb(), input))
  )
  ipcMain.handle(
    'notebook:update',
    mutate((id: number, input: UpdateNotebookInput) => updateNotebook(notebookDb(), id, input))
  )
  ipcMain.handle(
    'notebook:delete',
    remove((id) => deleteNotebook(notebookDb(), id))
  )
  ipcMain.handle(
    'notebook:reorder',
    mutate((ids: number[]) => reorderNotebooks(notebookDb(), ids))
  )

  ipcMain.handle('section:list', (_, notebookId: number) => listSections(notebookDb(), notebookId))
  ipcMain.handle(
    'section:create',
    mutate((input: CreateSectionInput) => createSection(notebookDb(), input))
  )
  ipcMain.handle(
    'section:update',
    mutate((id: number, input: UpdateSectionInput) => updateSection(notebookDb(), id, input))
  )
  ipcMain.handle(
    'section:delete',
    remove((id) => deleteSection(notebookDb(), id))
  )
  ipcMain.handle(
    'section:reorder',
    mutate((notebookId: number, ids: number[]) => reorderSections(notebookDb(), notebookId, ids))
  )

  ipcMain.handle('page:list', (_, sectionId: number) => listPages(notebookDb(), sectionId))
  ipcMain.handle('page:get', (_, id: number) => getPage(notebookDb(), id) ?? null)
  ipcMain.handle(
    'page:create',
    mutate((input: CreatePageInput) => createPage(notebookDb(), input))
  )
  ipcMain.handle(
    'page:updateTitle',
    mutate((id: number, title: string) => updatePageTitle(notebookDb(), id, title))
  )
  ipcMain.handle(
    'page:delete',
    remove((id) => deletePage(notebookDb(), id))
  )
  ipcMain.handle(
    'page:move',
    mutate((id: number, input: MovePageInput) => movePage(notebookDb(), id, input))
  )
  ipcMain.handle('page:saveNotes', (_, id: number, notes: string | null) =>
    updatePageNotes(notebookDb(), id, notes)
  )
  // Mesma regra do drawing:save da task: o PNG é gravado junto do JSON para as saídas derivadas
  // (Notion, export, MCP) não servirem um preview defasado.
  ipcMain.handle(
    'page:saveDrawing',
    async (_, id: number, drawing: string | null, preview: Uint8Array | null) => {
      const owner = { kind: 'page', id } as const
      if (drawing === null) {
        updatePageDrawing(notebookDb(), id, null)
        await deleteDrawingPreview(owner)
        return
      }
      if (preview) await saveDrawingPreview(owner, preview)
      updatePageDrawing(notebookDb(), id, drawing)
    }
  )
}
