import type { BackupCounts } from '../shared/types'

// O layout do snapshot e o MANIFEST.txt são lidos também por scripts/ticktask-backup.sh:
// mudar nomes ou rótulos aqui exige mudar lá.
export const DB_FILE = 'ticktask.db'
export const ASSET_DIRS = ['notes-assets', 'drawings']
export const CONFIG_FILES = ['notion-config.json', 'mcp-config.json']
export const MANIFEST_FILE = 'MANIFEST.txt'
export const PARTIAL_SUFFIX = '.partial'

export const SNAPSHOT_ITEMS = [DB_FILE, ...ASSET_DIRS, ...CONFIG_FILES]
export const RESTORE_REPLACED_ITEMS = [
  DB_FILE,
  `${DB_FILE}-wal`,
  `${DB_FILE}-shm`,
  ...ASSET_DIRS,
  ...CONFIG_FILES
]

const SNAPSHOT_NAME = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$/

const pad = (value: number): string => String(value).padStart(2, '0')

export function snapshotName(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${day}_${time}`
}

export function parseSnapshotName(name: string): Date | null {
  const match = SNAPSHOT_NAME.exec(name)
  if (!match) return null
  const [year, month, day, hours, minutes, seconds] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day, hours, minutes, seconds)
  return Number.isNaN(date.getTime()) ? null : date
}

export function sortSnapshotNames(names: string[]): string[] {
  return names.filter((name) => parseSnapshotName(name) !== null).sort((a, b) => b.localeCompare(a))
}

export function preRestoreName(date: Date): string {
  return `pre-restore-${snapshotName(date)}`
}

export interface ManifestInput {
  createdAt: Date
  host: string
  origin: string
  counts: BackupCounts
  hashes: { file: string; sha256: string }[]
}

const show = (value: number | null): string => (value === null ? '?' : String(value))

export function buildManifest(input: ManifestInput): string {
  const lines = [
    `data:            ${input.createdAt.toISOString()}`,
    `máquina:         ${input.host}`,
    `origem:          ${input.origin}`,
    `tasks:           ${show(input.counts.tasks)}`,
    `projetos:        ${show(input.counts.projects)}`,
    `entradas tempo:  ${show(input.counts.timeEntries)}`,
    '',
    'sha256:',
    ...[...input.hashes]
      .sort((a, b) => a.file.localeCompare(b.file))
      .map(({ file, sha256 }) => `${sha256}  ./${file}`)
  ]
  return `${lines.join('\n')}\n`
}

export function parseManifestCounts(text: string): BackupCounts {
  const read = (label: string): number | null => {
    const match = new RegExp(`^${label}:\\s+(\\d+)\\s*$`, 'm').exec(text)
    return match ? Number(match[1]) : null
  }
  return { tasks: read('tasks'), projects: read('projetos'), timeEntries: read('entradas tempo') }
}
