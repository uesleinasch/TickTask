import { promises as fs, existsSync, mkdirSync } from 'fs'
import path from 'path'
import type { NotesOwner, Task } from '@shared/types'
import { collectImageAssetIds } from './notionBlocks'
import { prosemirrorToMarkdown, type MarkdownImageResolver } from './notesMarkdown'
import { getNoteAsset } from './database'
import { getAssetFilePath } from './notesAssets'
import { drawingPreviewPath } from './drawingAssets'

export function yaml(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '""'
  return `"${String(value).replace(/"/g, '\\"')}"`
}

function buildFrontmatter(task: Task): string {
  const lines: string[] = ['---']
  lines.push(`titulo: ${yaml(task.name)}`)
  lines.push(`status: ${yaml(task.status)}`)
  lines.push(`categoria: ${yaml(task.category)}`)
  if (task.project_name) lines.push(`projeto: ${yaml(task.project_name)}`)
  const contexts = (task.contexts ?? []).map((c) => c.name)
  if (contexts.length) lines.push(`contextos: [${contexts.map((c) => yaml(c)).join(', ')}]`)
  lines.push(`tempo_total_min: ${Math.round((task.total_seconds ?? 0) / 60)}`)
  if (task.due_date) lines.push(`prazo: ${yaml(task.due_date)}`)
  if (task.scheduled_date) lines.push(`agendado: ${yaml(task.scheduled_date)}`)
  if (task.energy_level) lines.push(`energia: ${yaml(task.energy_level)}`)
  if (task.external_url) lines.push(`link: ${yaml(task.external_url)}`)
  if (task.jira_key) lines.push(`jira: ${yaml(task.jira_key)}`)
  if (task.updated_at) lines.push(`atualizado_em: ${yaml(task.updated_at)}`)
  lines.push('---')
  return lines.join('\n')
}

/** Caminho de `target` relativo a `fromDir`, com "/" mesmo no Windows (é um link Markdown). */
export function markdownRef(fromDir: string, target: string): string {
  return path.relative(fromDir, target).split(path.sep).join('/')
}

/** Copia as imagens da nota para `assetsDir` (idempotente). Devolve assetId → caminho absoluto. */
export async function copyNoteAssets(
  notes: string | null | undefined,
  assetsDir: string
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const assetIds = collectImageAssetIds(notes ?? undefined)
  if (!assetIds.length) return map
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
  for (const assetId of assetIds) {
    const asset = getNoteAsset(assetId)
    const srcPath = getAssetFilePath(assetId)
    if (!asset || !srcPath || !existsSync(srcPath)) continue
    const destPath = path.join(assetsDir, asset.filename)
    if (!existsSync(destPath)) await fs.copyFile(srcPath, destPath)
    map[assetId] = destPath
  }
  return map
}

// Além do PNG referenciado no Markdown, grava o .excalidraw: é o formato editável, o único
// que permite reabrir o desenho fora do app.
export async function writeDrawingFiles(
  owner: NotesOwner,
  drawing: string | null | undefined,
  assetsDir: string,
  baseName: string
): Promise<string | null> {
  if (!drawing) return null

  const srcPng = drawingPreviewPath(owner)
  if (!existsSync(srcPng)) return null

  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
  const pngPath = path.join(assetsDir, `${baseName}.png`)
  await fs.copyFile(srcPng, pngPath)
  await fs.writeFile(path.join(assetsDir, `${baseName}.excalidraw`), drawing, 'utf8')
  return pngPath
}

/** Escreve a task (metadados + notas) como Markdown em filePath, copiando as imagens. */
export async function exportTaskToLocal(task: Task, filePath: string): Promise<void> {
  const destDir = path.dirname(filePath)
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  const assetsDir = path.join(destDir, 'assets')
  const assetMap = await copyNoteAssets(task.notes, assetsDir)
  const resolveImage: MarkdownImageResolver = (id) =>
    assetMap[id] ? markdownRef(destDir, assetMap[id]) : `assets/${id}`
  const body = prosemirrorToMarkdown(task.notes, resolveImage)
  const pngPath = await writeDrawingFiles(
    { kind: 'task', id: task.id },
    task.drawing,
    assetsDir,
    `desenho-${task.id}`
  )
  const drawingSection = pngPath
    ? `\n\n## Desenho\n\n![Desenho](${markdownRef(destDir, pngPath)})\n`
    : ''
  const content = `${buildFrontmatter(task)}\n\n# ${task.name}\n\n${body}\n${drawingSection}`
  await fs.writeFile(filePath, content, 'utf8')
}
