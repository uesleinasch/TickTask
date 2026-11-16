import type { BrowserWindow } from 'electron'
import { notebookDb } from './database'
import { getNotionPageId, listPageSubtree, type NotebookNodeKind } from './notebookQueries'
import { deleteDrawingPreview } from './drawingAssets'
import { createDebouncedSerialQueue } from './debouncedSerialQueue'
import {
  archiveNotionPage,
  isNotebookAutoSyncOn,
  notebookSyncLabel,
  syncNotebookTarget,
  type NotebookSyncTarget
} from './notionNotebooks'

const NOTION_SYNC_DELAY_MS = 3000

// Injetado no boot: este módulo é usado pelo IPC e pelas tools do MCP, e importar a janela de
// index.ts fecharia um ciclo de imports.
let getWindow: () => BrowserWindow | null = () => null

export function initNotebookService(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter
}

function send(channel: string, ...args: unknown[]): void {
  const window = getWindow()
  if (window && !window.isDestroyed()) window.webContents.send(channel, ...args)
}

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

export function refreshNotebooks(): void {
  send('notebooks:refresh')
}

export function autoSyncNotebook(...targets: NotebookSyncTarget[]): void {
  if (!isNotebookAutoSyncOn()) return
  for (const target of targets) queue.schedule(keyOf(target), runSync(target))
}

export function syncNotebookNow(target: NotebookSyncTarget): Promise<void> {
  return queue.now(keyOf(target), runSync(target))
}

/** Mudança de estrutura (criar, renomear): a tela recarrega e o item vai para o Notion. */
export function afterNotebookStructureChange(target: NotebookSyncTarget): void {
  refreshNotebooks()
  autoSyncNotebook(target)
}

export function afterPageMoved(pageId: number): void {
  refreshNotebooks()
  autoSyncNotebook(
    ...listPageSubtree(notebookDb(), pageId).map((id) => ({ kind: 'page' as const, id }))
  )
}

/**
 * Apaga um nó (e tudo abaixo), os PNGs dos desenhos atingidos e arquiva o nó no Notion — arquivar o
 * de cima arquiva os de baixo.
 */
export async function removeNotebookNode(
  kind: NotebookNodeKind,
  id: number,
  remove: (id: number) => number[]
): Promise<number[]> {
  const notionId = getNotionPageId(notebookDb(), kind, id)
  const pageIds = remove(id)
  refreshNotebooks()
  if (notionId && isNotebookAutoSyncOn()) {
    queue.now(`archive:${notionId}`, () => archiveNotionPage(notionId)).catch(() => undefined)
  }
  await Promise.all(pageIds.map((pageId) => deleteDrawingPreview({ kind: 'page', id: pageId })))
  return pageIds
}
