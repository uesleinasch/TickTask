import type { Editor } from '@tiptap/core'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function uploadAndInsert(
  editor: Editor,
  taskId: number,
  file: File,
  pos?: number
): Promise<void> {
  if (!file.type.startsWith('image/')) return
  if (file.size > MAX_IMAGE_BYTES) {
    window.alert('Imagem maior que 5 MB não é suportada na sincronização com o Notion.')
    return
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { assetId, src } = await window.api.saveNoteImage(taskId, bytes, file.name, file.type)
  const node = { type: 'image', attrs: { src, assetId } }
  const chain = editor.chain().focus()
  if (typeof pos === 'number') chain.insertContentAt(pos, node)
  else chain.insertContent(node)
  chain.run()
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = IMAGE_MIME_TYPES.join(',')
    // O cancelamento do seletor nativo não dispara 'change' em todos os ambientes; sem o
    // 'cancel' a promise ficaria pendente para sempre.
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}
