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

// As fontes do Excalidraw são servidas por aqui, e não por file://, porque o renderer roda em
// file:// em produção — origem opaca, da qual o Chromium recusa carregar fontes. O diretório fica
// dentro do app.asar; por isso o corpo é lido com fs (que entende asar) em vez de net.fetch.
export const EXCALIDRAW_HOST = 'excalidraw'

const EXCALIDRAW_MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css'
}

function excalidrawAssetsDir(): string {
  return path.join(app.getAppPath(), 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'prod')
}

async function serveExcalidrawAsset(pathname: string): Promise<Response> {
  const root = excalidrawAssetsDir()
  const target = path.resolve(root, decodeURIComponent(pathname).replace(/^\/+/, ''))
  // O pathname vem da página; sem esta checagem um ../ escaparia do diretório de assets.
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const body = await fs.readFile(target)
    const mime = EXCALIDRAW_MIME[path.extname(target)] ?? 'application/octet-stream'
    return new Response(new Uint8Array(body), { headers: { 'Content-Type': mime } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

/** Chamar DENTRO de app.whenReady(). O scheme precisa ser privilegiado antes (ver index.ts). */
export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    const url = new URL(request.url)
    if (url.host === EXCALIDRAW_HOST) {
      return serveExcalidrawAsset(url.pathname)
    }

    // URL: ticktask-asset://asset/<assetId>
    const assetId = url.pathname.replace(/^\/+/, '')
    const filePath = getAssetFilePath(assetId)
    if (!filePath || !existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
