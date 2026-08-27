import { homedir } from 'os'
import { join } from 'path'

// Espelha app.getPath('userData') do Electron, que usa o "name" do package.json. A ponte MCP
// roda fora do Electron e não tem acesso a essa API — se o name mudar, muda aqui também.
const APP_DIR = 'ticktask'

export interface UserDataSource {
  platform: NodeJS.Platform
  env: Record<string, string | undefined>
  home: string
}

export function userDataDir(source: Partial<UserDataSource> = {}): string {
  const platform = source.platform ?? process.platform
  const env = source.env ?? process.env
  const home = source.home ?? homedir()

  if (platform === 'win32') {
    const appData = env.APPDATA
    const base = appData && appData.length > 0 ? appData : join(home, 'AppData', 'Roaming')
    return join(base, APP_DIR)
  }

  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', APP_DIR)
  }

  const xdg = env.XDG_CONFIG_HOME
  const base = xdg && xdg.length > 0 ? xdg : join(home, '.config')
  return join(base, APP_DIR)
}
