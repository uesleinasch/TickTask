import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { createSuggestionRenderer } from '../suggestionPopup'
import { pickImageFile, uploadAndInsert } from '../imageUpload'
import { SlashMenu, type SlashItem } from './SlashMenu'

export interface SlashCommandOptions {
  taskId: number
}

// Precisa acompanhar o número de itens: um limite menor que a lista esconde os últimos
// comandos de quem abre o menu sem digitar nada.
const MAX_VISIBLE_ITEMS = 12

const ITEMS: SlashItem[] = [
  {
    title: 'Título 1',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
  },
  {
    title: 'Título 2',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
  },
  {
    title: 'Título 3',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
  },
  {
    title: 'Lista',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
  },
  {
    title: 'Lista numerada',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
  },
  {
    title: 'Checklist',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
  },
  {
    title: 'Citação',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
  },
  {
    title: 'Código',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
  },
  {
    title: 'Divisor',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
  },
  {
    title: 'Tabela',
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
  }
]

function itemsFor(taskId: number): SlashItem[] {
  return [
    ...ITEMS,
    {
      title: 'Imagem',
      command: ({ editor, range }) => {
        // O range do "/" precisa sair antes do seletor: o diálogo nativo rouba o foco e a
        // posição registrada aqui não sobrevive ao retorno.
        editor.chain().focus().deleteRange(range).run()
        void pickImageFile().then((file) => {
          if (file) void uploadAndInsert(editor, taskId, file)
        })
      }
    }
  ]
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',
  addOptions() {
    return { taskId: 0 }
  },
  addProseMirrorPlugins() {
    const items = itemsFor(this.options.taskId)
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          items
            .filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, MAX_VISIBLE_ITEMS),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: createSuggestionRenderer<SlashItem>(SlashMenu)
      })
    ]
  }
})
