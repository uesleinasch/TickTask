import { app, protocol, net } from 'electron'
import { randomUUID, createHash } from 'crypto'
import { promises as fs, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createNoteAsset, getNoteAsset } from './database'

export const ASSET_SCHEME = 'ticktask-asset'

function assetsDir(): string {
  const dir = path.join(app.getPath('userData'), 'notes-assets')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function extFor(filename: string, mime: string): string {
  const fromName = path.extname(filename)
  if (fromName) return fromName
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  }
  return map[mime] ?? '.bin'
}

export async function saveNoteImage(
  taskId: number,
  bytes: Uint8Array,
  filename: string,
  mime: string
): Promise<{ assetId: string; src: string }> {
  const assetId = randomUUID()
  const buffer = Buffer.from(bytes)
  const ext = extFor(filename, mime)
  const filePath = path.join(assetsDir(), `${assetId}${ext}`)
  await fs.writeFile(filePath, buffer)
  const contentHash = createHash('sha256').update(buffer).digest('hex')
  createNoteAsset({
    taskId,
    assetId,
    filename: `${assetId}${ext}`,
    mime,
    contentHash,
    createdAt: Date.now()
  })
  return { assetId, src: `${ASSET_SCHEME}://asset/${assetId}` }
}

export function getAssetFilePath(assetId: string): string | null {
  const asset = getNoteAsset(assetId)
  if (!asset) return null
  return path.join(assetsDir(), asset.filename)
}

/** Chamar DENTRO de app.whenReady(). O scheme precisa ser privilegiado antes (ver index.ts). */
export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    // URL: ticktask-asset://asset/<assetId>
    const assetId = new URL(request.url).pathname.replace(/^\/+/, '')
    const filePath = getAssetFilePath(assetId)
    if (!filePath || !existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
