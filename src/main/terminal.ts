import { BrowserWindow, dialog, ipcMain } from 'electron'
import { accessSync, constants, statSync } from 'fs'
import type { TerminalCreateResult, TerminalTabCustomization } from '@shared/types'
import { getTask, setTaskWorkspace } from './database'
import { TerminalManager, resolveShell, type SpawnPty } from './terminalSessions'

let manager: TerminalManager | null = null
let loadError: string | null = null

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
}

// node-pty é nativo: carregá-lo no boot derrubaria o app inteiro se o binário estiver com a ABI
// errada. Carregado sob demanda, a falha fica restrita ao painel do terminal.
async function getManager(getWindow: () => BrowserWindow | null): Promise<TerminalManager | null> {
  if (manager) return manager
  if (loadError) return null
  try {
    const pty = await import('node-pty')
    const send = (channel: string, ...args: unknown[]): void => {
      const window = getWindow()
      if (window && !window.isDestroyed()) window.webContents.send(channel, ...args)
    }
    manager = new TerminalManager({
      spawn: pty.spawn as unknown as SpawnPty,
      env: processEnv(),
      events: {
        data: (id, chunk, seq) => send('terminal:data', id, chunk, seq),
        exit: (id, code) => send('terminal:exit', id, code),
        removed: (id) => send('terminal:removed', id)
      }
    })
    return manager
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error)
    console.error('[terminal] node-pty não carregou:', error)
    return null
  }
}

export function registerTerminalIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'terminal:create',
    async (
      _,
      taskId: number,
      options: { shell?: string | null; cols?: number; rows?: number }
    ): Promise<TerminalCreateResult> => {
      const task = getTask(taskId)
      if (!task) return { ok: false, reason: 'no-task', error: 'Task não encontrada.' }
      if (!task.working_dir) {
        return { ok: false, reason: 'no-dir', error: 'Defina o diretório de trabalho da task.' }
      }
      if (!isDirectory(task.working_dir)) {
        return {
          ok: false,
          reason: 'bad-dir',
          error: `O diretório não existe ou não é uma pasta: ${task.working_dir}`
        }
      }
      const terminals = await getManager(getWindow)
      if (!terminals) {
        return {
          ok: false,
          reason: 'pty-unavailable',
          error: `O terminal não pôde ser carregado (${loadError}). Rode "npm run postinstall" e reinicie o app.`
        }
      }
      const { shell, fellBack } = resolveShell(
        options.shell,
        process.platform,
        process.env,
        isExecutable
      )
      try {
        const session = terminals.create({
          taskId,
          taskName: task.name,
          cwd: task.working_dir,
          shell,
          startCommand: task.start_command,
          cols: options.cols,
          rows: options.rows
        })
        return { ok: true, session, shellFallback: fellBack }
      } catch (error) {
        return {
          ok: false,
          reason: 'pty-unavailable',
          error: `Não foi possível abrir o shell ${shell}: ${error instanceof Error ? error.message : error}`
        }
      }
    }
  )
  ipcMain.handle('terminal:write', (_, id: string, data: string) => manager?.write(id, data))
  ipcMain.handle('terminal:resize', (_, id: string, cols: number, rows: number) =>
    manager?.resize(id, cols, rows)
  )
  ipcMain.handle('terminal:dispose', (_, id: string) => manager?.dispose(id))
  ipcMain.handle('terminal:list', () => manager?.list() ?? [])
  ipcMain.handle('terminal:customize', (_, id: string, patch: TerminalTabCustomization) =>
    manager ? manager.customize(id, patch) : null
  )
  ipcMain.handle('terminal:getBuffer', (_, id: string) => manager?.getBuffer(id) ?? null)
  ipcMain.handle('terminal:pickDirectory', async (_, taskId: number) => {
    const task = getTask(taskId)
    if (!task) return null
    const window = getWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Diretório de trabalho da task',
      defaultPath: task.working_dir ?? undefined,
      properties: ['openDirectory']
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    const dir = result.canceled ? null : (result.filePaths[0] ?? null)
    if (dir) setTaskWorkspace(taskId, { working_dir: dir })
    return dir
  })
  ipcMain.handle(
    'terminal:setTaskWorkspace',
    (
      _,
      taskId: number,
      workspace: { working_dir?: string | null; start_command?: string | null }
    ) => setTaskWorkspace(taskId, workspace)
  )
}

export function disposeTerminalsForTasks(taskIds: number[]): void {
  manager?.disposeForTasks(taskIds)
}

export function killAllTerminals(): void {
  manager?.killAll()
}
