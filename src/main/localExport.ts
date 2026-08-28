import { promises as fs, existsSync, mkdirSync } from 'fs'
import path from 'path'
import type { Task } from '@shared/types'
import { collectImageAssetIds } from './notionBlocks'
import { prosemirrorToMarkdown, type MarkdownImageResolver } from './notesMarkdown'
import { getNoteAsset } from './database'
import { getAssetFilePath } from './notesAssets'
import { drawingPreviewPath } from './drawingAssets'

function yaml(value: string | number | undefined | null): string {
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
  if (task.updated_at) lines.push(`atualizado_em: ${yaml(task.updated_at)}`)
  lines.push('---')
  return lines.join('\n')
}

// Copia as imagens referenciadas para <destDir>/assets/ (idempotente) e devolve
// o mapa assetId -> caminho relativo usado no Markdown.
async function copyAssets(
  notes: string | undefined,
  destDir: string
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const assetIds = collectImageAssetIds(notes)
  if (!assetIds.length) return map
  const assetsDir = path.join(destDir, 'assets')
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
  for (const assetId of assetIds) {
    const asset = getNoteAsset(assetId)
    const srcPath = getAssetFilePath(assetId)
    if (!asset || !srcPath || !existsSync(srcPath)) continue
    const destPath = path.join(assetsDir, asset.filename)
    if (!existsSync(destPath)) await fs.copyFile(srcPath, destPath)
    map[assetId] = `assets/${asset.filename}`
  }
  return map
}

// Além do PNG referenciado no Markdown, grava o .excalidraw: é o formato editável, o único
// que permite reabrir o desenho fora do app.
async function exportDrawing(task: Task, destDir: string): Promise<string | null> {
  if (!task.drawing) return null

  const srcPng = drawingPreviewPath(task.id)
  if (!existsSync(srcPng)) return null

  const assetsDir = path.join(destDir, 'assets')
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })

  const pngName = `desenho-${task.id}.png`
  await fs.copyFile(srcPng, path.join(assetsDir, pngName))
  await fs.writeFile(path.join(assetsDir, `desenho-${task.id}.excalidraw`), task.drawing, 'utf8')
  return `assets/${pngName}`
}

/** Escreve a task (metadados + notas) como Markdown em filePath, copiando as imagens. */
export async function exportTaskToLocal(task: Task, filePath: string): Promise<void> {
  const destDir = path.dirname(filePath)
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  const assetMap = await copyAssets(task.notes, destDir)
  const resolveImage: MarkdownImageResolver = (id) => assetMap[id] ?? `assets/${id}`
  const body = prosemirrorToMarkdown(task.notes, resolveImage)
  const drawingRef = await exportDrawing(task, destDir)
  const drawingSection = drawingRef ? `\n\n## Desenho\n\n![Desenho](${drawingRef})\n` : ''
  const content = `${buildFrontmatter(task)}\n\n# ${task.name}\n\n${body}\n${drawingSection}`
  await fs.writeFile(filePath, content, 'utf8')
}
