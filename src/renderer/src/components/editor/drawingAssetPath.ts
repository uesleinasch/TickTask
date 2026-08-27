// O Excalidraw resolve valores começando com "./" ou "/" contra window.location.origin, que em
// file:// é a string "null" — daí a URL absoluta do protocolo privilegiado do app, servido por
// registerAssetProtocol(). Precisa ser definido antes de o pacote carregar suas fontes.
const ASSET_PATH = 'ticktask-asset://excalidraw/'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}

export function ensureExcalidrawAssetPath(): void {
  if (window.EXCALIDRAW_ASSET_PATH === ASSET_PATH) return
  window.EXCALIDRAW_ASSET_PATH = ASSET_PATH
}
