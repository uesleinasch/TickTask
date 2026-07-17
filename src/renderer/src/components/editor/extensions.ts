import type { Editor, Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import Image from '@tiptap/extension-image'
import FileHandler from '@tiptap/extension-file-handler'
import { SlashCommand } from './slash/SlashCommand'
import { MentionExtension } from './mention/mentionConfig'

const ImageWithAsset = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null }
    }
  }
})

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

async function uploadAndInsert(
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

export function buildExtensions(taskId: number): Extensions {
  return [
    // StarterKit v3: paragraph, heading, listas, blockquote, codeBlock, hr,
    // bold, italic, strike, code, link, underline, histórico (undo/redo).
    StarterKit,
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: 'Escreva suas anotações... (digite / para comandos)' }),
    SlashCommand,
    MentionExtension,
    ImageWithAsset,
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      // Consome o evento de paste quando há arquivos, evitando que outras paste
      // rules insiram conteúdo duplicado.
      consumePasteEvent: true,
      onDrop: (editor, files, pos) => {
        files.forEach((file) => void uploadAndInsert(editor, taskId, file, pos))
      },
      onPaste: (editor, files) => {
        files.forEach((file) => void uploadAndInsert(editor, taskId, file))
      }
    })
  ]
}
