import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'

export function buildExtensions(): Extensions {
  return [
    // StarterKit v3: paragraph, heading, listas, blockquote, codeBlock, hr,
    // bold, italic, strike, code, link, underline, histórico (undo/redo).
    StarterKit,
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: 'Escreva suas anotações... (digite / para comandos)' })
  ]
}
