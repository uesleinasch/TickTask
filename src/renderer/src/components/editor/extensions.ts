import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import Image from '@tiptap/extension-image'
import FileHandler from '@tiptap/extension-file-handler'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import { TableKit } from '@tiptap/extension-table'
import { SlashCommand } from './slash/SlashCommand'
import { MentionExtension } from './mention/mentionConfig'
import { IMAGE_MIME_TYPES, uploadAndInsert } from './imageUpload'

const ImageWithAsset = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null }
    }
  }
})

export function buildExtensions(taskId: number): Extensions {
  return [
    // StarterKit v3: paragraph, heading, listas, blockquote, codeBlock, hr,
    // bold, italic, strike, code, link, underline, histórico (undo/redo).
    StarterKit,
    Highlight,
    // FontSize grava numa mark textStyle, que precisa estar registrada antes.
    TextStyle,
    FontSize,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: 'Escreva suas anotações... (digite / para comandos)' }),
    TableKit.configure({ table: { resizable: true } }),
    SlashCommand.configure({ taskId }),
    MentionExtension,
    ImageWithAsset,
    FileHandler.configure({
      allowedMimeTypes: IMAGE_MIME_TYPES,
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
