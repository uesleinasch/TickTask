import { Menu, Tray, nativeImage } from 'electron'
import trayIconPath from '../../resources/32.png?asset'

export interface TrayActions {
  showMainWindow: () => void
  openQuickCapture: () => void
  quit: () => void
}

let tray: Tray | null = null

export function createTray(actions: TrayActions): void {
  if (tray && !tray.isDestroyed()) return

  tray = new Tray(nativeImage.createFromPath(trayIconPath))
  tray.setToolTip('TickTask App')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir TickTask', click: () => actions.showMainWindow() },
      { label: 'Captura rápida', click: () => actions.openQuickCapture() },
      { type: 'separator' },
      { label: 'Sair', click: () => actions.quit() }
    ])
  )
  tray.on('click', () => actions.showMainWindow())
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
  }
  tray = null
}
