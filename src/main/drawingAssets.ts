import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { promises as fs } from 'fs'
import path from 'path'

const DIR_NAME = 'drawings'

function drawingsDir(): string {
  const dir = path.join(app.getPath('userData'), DIR_NAME)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function drawingPreviewPath(taskId: number): string {
  return path.join(drawingsDir(), `${taskId}.png`)
}

export async function saveDrawingPreview(taskId: number, bytes: Uint8Array): Promise<string> {
  const filePath = drawingPreviewPath(taskId)
  await fs.writeFile(filePath, Buffer.from(bytes))
  return filePath
}

export async function readDrawingPreview(taskId: number): Promise<Buffer | null> {
  const filePath = drawingPreviewPath(taskId)
  if (!existsSync(filePath)) return null
  return fs.readFile(filePath)
}

export async function deleteDrawingPreview(taskId: number): Promise<void> {
  await fs.rm(drawingPreviewPath(taskId), { force: true })
}
