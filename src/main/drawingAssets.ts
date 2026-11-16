import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { promises as fs } from 'fs'
import path from 'path'
import type { NotesOwner } from '@shared/types'

const DIR_NAME = 'drawings'

function drawingsDir(owner: NotesOwner): string {
  const root = path.join(app.getPath('userData'), DIR_NAME)
  const dir = owner.kind === 'page' ? path.join(root, 'pages') : root
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function drawingPreviewPath(owner: NotesOwner): string {
  return path.join(drawingsDir(owner), `${owner.id}.png`)
}

export async function saveDrawingPreview(owner: NotesOwner, bytes: Uint8Array): Promise<string> {
  const filePath = drawingPreviewPath(owner)
  await fs.writeFile(filePath, Buffer.from(bytes))
  return filePath
}

export async function readDrawingPreview(owner: NotesOwner): Promise<Buffer | null> {
  const filePath = drawingPreviewPath(owner)
  if (!existsSync(filePath)) return null
  return fs.readFile(filePath)
}

export async function deleteDrawingPreview(owner: NotesOwner): Promise<void> {
  await fs.rm(drawingPreviewPath(owner), { force: true })
}
