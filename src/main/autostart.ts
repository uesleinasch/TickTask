import { app } from 'electron'
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { HIDDEN_FLAG } from './launchArgs'

const DESKTOP_FILE = 'ticktask.desktop'

function autostartDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config')
  return join(base, 'autostart')
}

function autostartFile(): string {
  return join(autostartDir(), DESKTOP_FILE)
}

// Em AppImage o process.execPath aponta para dentro do volume temporário montado, que não
// existe no próximo boot; APPIMAGE guarda o caminho real do arquivo distribuído.
function launcherPath(): string {
  return process.env.APPIMAGE ?? process.execPath
}

function desktopEntry(): string {
  return `[Desktop Entry]
Type=Application
Name=TickTask App
Comment=Iniciar o TickTask na bandeja junto com a sessão
Exec="${launcherPath()}" ${HIDDEN_FLAG}
Icon=ticktask
Terminal=false
Categories=Utility;
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
`
}

export function isAutostartEnabled(): boolean {
  try {
    if (process.platform === 'linux') {
      return fs.existsSync(autostartFile())
    }
    return app.getLoginItemSettings().openAtLogin
  } catch (error) {
    console.error('[autostart] falha ao ler o estado:', error)
    return false
  }
}

export function setAutostartEnabled(enabled: boolean): boolean {
  try {
    if (process.platform === 'linux') {
      if (enabled) {
        fs.mkdirSync(autostartDir(), { recursive: true })
        fs.writeFileSync(autostartFile(), desktopEntry(), 'utf-8')
      } else {
        fs.rmSync(autostartFile(), { force: true })
      }
    } else {
      app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_FLAG] })
    }
  } catch (error) {
    console.error('[autostart] falha ao gravar o estado:', error)
  }

  return isAutostartEnabled()
}
