import type { BrowserWindow } from 'electron'

interface WriteEffectDeps {
  getMainWindow: () => BrowserWindow | null
  autoSync: (id: number) => void
}

// Injetado no boot (index.ts) em vez de importado diretamente: index.ts importa deste módulo
// através das tools, e um import direto daqui para index.ts criaria um ciclo.
let deps: WriteEffectDeps | null = null

export function registerWriteEffects(next: WriteEffectDeps): void {
  deps = next
}

export function broadcastRefresh(): void {
  const window = deps?.getMainWindow()
  if (window && !window.isDestroyed()) {
    window.webContents.send('tasks:refresh')
  }
}

export function afterTaskWrite(id: number): void {
  deps?.autoSync(id)
  broadcastRefresh()
}
