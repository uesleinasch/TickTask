import type { BrowserWindow } from 'electron'

interface WriteEffectDeps {
  getMainWindow: () => BrowserWindow | null
  autoSync: (id: number) => void
  syncTagChange: (taskIds: number[]) => void
}

// Injetado no boot em vez de importado direto: as tools de escrita (ainda a criar) vão importar
// daqui, e index.ts importa as tools — um import direto deste módulo para index.ts fecharia o ciclo.
let deps: WriteEffectDeps | null = null

function warnDepsMissing(action: string): void {
  console.warn(`[mcp] registerWriteEffects ainda não foi chamado; ${action} foi ignorado.`)
}

export function registerWriteEffects(next: WriteEffectDeps): void {
  deps = next
}

export function broadcastRefresh(): void {
  if (!deps) {
    warnDepsMissing('o refresh da janela principal')
    return
  }
  const window = deps.getMainWindow()
  if (window && !window.isDestroyed()) {
    window.webContents.send('tasks:refresh')
  }
}

export function afterTaskWrite(id: number): void {
  if (!deps) {
    warnDepsMissing(`o efeito de escrita da tarefa ${id}`)
    return
  }
  deps.autoSync(id)
  broadcastRefresh()
}

export function afterTagChange(taskIds: number[]): void {
  if (!deps) {
    warnDepsMissing('a ressincronização de tasks após mudança de tag')
    return
  }
  if (taskIds.length === 0) return
  deps.syncTagChange(taskIds)
}
