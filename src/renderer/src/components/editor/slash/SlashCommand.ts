import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { createSuggestionRenderer } from '../suggestionPopup'
import { SlashMenu, type SlashItem } from './SlashMenu'

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
  }
]

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          ITEMS.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: createSuggestionRenderer<SlashItem>(SlashMenu)
      })
    ]
  }
})
