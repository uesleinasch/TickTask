import { app, dialog, type BrowserWindow, type OpenDialogOptions } from 'electron'
import Database from 'better-sqlite3'
import { createHash } from 'crypto'
import fs from 'fs'
import { hostname } from 'os'
import path from 'path'
import type { BackupCounts, BackupSnapshot, BackupStatus } from '../shared/types'
import { backupDatabase } from './database'
import {
  ASSET_DIRS,
  CONFIG_FILES,
  DB_FILE,
  MANIFEST_FILE,
  PARTIAL_SUFFIX,
  RESTORE_REPLACED_ITEMS,
  SNAPSHOT_ITEMS,
  buildManifest,
  parseManifestCounts,
  parseSnapshotName,
  preRestoreName,
  snapshotName,
  sortSnapshotNames
} from './backupPlan'

interface BackupConfig {
  folder: string | null
}

const dataDir = (): string => app.getPath('userData')
const configPath = (): string => path.join(dataDir(), 'backup-config.json')

function readConfig(): BackupConfig {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as Partial<BackupConfig>
    return { folder: typeof parsed.folder === 'string' ? parsed.folder : null }
  } catch {
    return { folder: null }
  }
}

function writeConfig(config: BackupConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}

async function showOpenDialog(
  win: BrowserWindow | null,
  options: OpenDialogOptions
): Promise<string | null> {
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
}

function readDbCounts(dbPath: string): BackupCounts {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const integrity = db.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`O banco do backup está corrompido: ${integrity}`)
    const count = (table: string): number | null => {
      try {
        return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
      } catch {
        return null
      }
    }
    return {
      tasks: count('tasks'),
      projects: count('projects'),
      timeEntries: count('time_entries')
    }
  } finally {
    db.close()
  }
}

async function listFiles(root: string, relative = ''): Promise<string[]> {
  const entries = await fs.promises.readdir(path.join(root, relative), { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listFiles(root, child)))
    else if (entry.isFile()) files.push(child)
  }
  return files
}

async function sha256(file: string): Promise<string> {
  return createHash('sha256')
    .update(await fs.promises.readFile(file))
    .digest('hex')
}

async function totalSize(root: string): Promise<number> {
  let size = 0
  for (const file of await listFiles(root)) {
    size += (await fs.promises.stat(path.join(root, file))).size
  }
  return size
}

async function describeSnapshot(dir: string, counts?: BackupCounts): Promise<BackupSnapshot> {
  const name = path.basename(dir)
  const createdAt = parseSnapshotName(name) ?? (await fs.promises.stat(dir)).mtime
  let resolved = counts
  if (!resolved) {
    try {
      resolved = parseManifestCounts(
        await fs.promises.readFile(path.join(dir, MANIFEST_FILE), 'utf-8')
      )
    } catch {
      resolved = { tasks: null, projects: null, timeEntries: null }
    }
  }
  return {
    name,
    path: dir,
    createdAt: createdAt.toISOString(),
    sizeBytes: await totalSize(dir),
    counts: resolved
  }
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const { folder } = readConfig()
  if (!folder || !fs.existsSync(folder)) return { folder, snapshots: [] }

  const entries = await fs.promises.readdir(folder, { withFileTypes: true })
  const names = sortSnapshotNames(entries.filter((e) => e.isDirectory()).map((e) => e.name))
  const snapshots = await Promise.all(
    names.map((name) => describeSnapshot(path.join(folder, name)))
  )
  return { folder, snapshots }
}

export async function chooseBackupFolder(win: BrowserWindow | null): Promise<BackupStatus | null> {
  const folder = await showOpenDialog(win, {
    title: 'Pasta onde guardar os backups',
    defaultPath: readConfig().folder ?? undefined,
    properties: ['openDirectory', 'createDirectory']
  })
  if (!folder) return null
  writeConfig({ folder })
  return getBackupStatus()
}

export async function createBackup(): Promise<BackupSnapshot> {
  const { folder } = readConfig()
  if (!folder) throw new Error('Escolha uma pasta de backup primeiro.')

  const createdAt = new Date()
  const dest = path.join(folder, snapshotName(createdAt))
  const tmp = `${dest}${PARTIAL_SUFFIX}`
  if (fs.existsSync(dest)) throw new Error('Já existe um backup com este horário. Tente de novo.')

  await fs.promises.mkdir(folder, { recursive: true })
  await fs.promises.rm(tmp, { recursive: true, force: true })
  await fs.promises.mkdir(tmp, { mode: 0o700 })

  try {
    const dbCopy = path.join(tmp, DB_FILE)
    await backupDatabase(dbCopy)
    const copy = new Database(dbCopy)
    copy.pragma('journal_mode = DELETE')
    copy.close()
    const counts = readDbCounts(dbCopy)

    for (const dir of ASSET_DIRS) {
      const source = path.join(dataDir(), dir)
      if (fs.existsSync(source)) {
        await fs.promises.cp(source, path.join(tmp, dir), {
          recursive: true,
          preserveTimestamps: true
        })
      }
    }
    for (const file of CONFIG_FILES) {
      const source = path.join(dataDir(), file)
      if (fs.existsSync(source)) await fs.promises.copyFile(source, path.join(tmp, file))
    }

    const hashes = await Promise.all(
      (await listFiles(tmp)).map(async (file) => ({
        file,
        sha256: await sha256(path.join(tmp, file))
      }))
    )
    const manifest = buildManifest({
      createdAt,
      host: hostname(),
      origin: dataDir(),
      counts,
      hashes
    })
    await fs.promises.writeFile(path.join(tmp, MANIFEST_FILE), manifest, 'utf-8')

    await fs.promises.rename(tmp, dest)
    return describeSnapshot(dest, counts)
  } catch (error) {
    await fs.promises.rm(tmp, { recursive: true, force: true })
    throw error
  }
}

export async function chooseSnapshotFolder(win: BrowserWindow | null): Promise<string | null> {
  return showOpenDialog(win, {
    title: 'Escolha a pasta do backup (a que contém ticktask.db)',
    defaultPath: readConfig().folder ?? undefined,
    properties: ['openDirectory']
  })
}

export async function inspectSnapshot(dir: string): Promise<BackupSnapshot> {
  if (!fs.existsSync(path.join(dir, DB_FILE))) {
    throw new Error(`A pasta escolhida não é um backup do TickTask (não tem ${DB_FILE}).`)
  }
  return describeSnapshot(dir, readDbCounts(path.join(dir, DB_FILE)))
}

// Só pode rodar com o banco fechado. Os dados atuais vão para pre-restore-<carimbo> dentro da
// pasta de dados; se a cópia falhar no meio, eles voltam para o lugar.
export async function restoreSnapshot(dir: string): Promise<string> {
  const safety = path.join(dataDir(), preRestoreName(new Date()))
  const moved: string[] = []

  for (const item of RESTORE_REPLACED_ITEMS) {
    const current = path.join(dataDir(), item)
    if (!fs.existsSync(current)) continue
    await fs.promises.mkdir(safety, { recursive: true })
    await fs.promises.rename(current, path.join(safety, item))
    moved.push(item)
  }

  try {
    for (const item of SNAPSHOT_ITEMS) {
      const source = path.join(dir, item)
      if (fs.existsSync(source)) {
        await fs.promises.cp(source, path.join(dataDir(), item), {
          recursive: true,
          preserveTimestamps: true
        })
      }
    }
  } catch (error) {
    for (const item of SNAPSHOT_ITEMS) {
      await fs.promises.rm(path.join(dataDir(), item), { recursive: true, force: true })
    }
    for (const item of moved) {
      await fs.promises.rename(path.join(safety, item), path.join(dataDir(), item))
    }
    throw error
  }

  return safety
}
