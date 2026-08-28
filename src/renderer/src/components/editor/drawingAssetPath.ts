// O Excalidraw resolve valores começando com "./" ou "/" contra window.location.origin, que em
// file:// é a string "null" — daí a URL absoluta do protocolo privilegiado do app, servido por
// registerAssetProtocol(). Precisa ser definido antes de o pacote carregar suas fontes.
const ASSET_PATH = 'ticktask-asset://excalidraw/'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}

// Executado no import, e importado pelo entry do renderer: os `import` de um módulo ES são
// avaliados antes do corpo dele, então chamar isto dentro do componente do editor rodaria
// depois de o Excalidraw já ter resolvido o caminho — e ele cai no CDN, que a CSP recusa.
window.EXCALIDRAW_ASSET_PATH = ASSET_PATH

export function ensureExcalidrawAssetPath(): void {
  window.EXCALIDRAW_ASSET_PATH = ASSET_PATH
}
