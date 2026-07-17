import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Strikethrough, Code, Highlighter, Link as LinkIcon } from 'lucide-react'

export function BubbleToolbar({ editor }: { editor: Editor | null }): React.JSX.Element | null {
  if (!editor) return null
  const btn = 'p-1.5 rounded hover:bg-slate-100 text-slate-700'
  const active = 'bg-slate-200 text-slate-900'
  return (
    <BubbleMenu
      editor={editor}
      className="flex gap-0.5 rounded-md border border-slate-200 bg-white p-1 shadow-md"
    >
      <button
        className={`${btn} ${editor.isActive('bold') ? active : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </button>
      <button
        className={`${btn} ${editor.isActive('italic') ? active : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </button>
      <button
        className={`${btn} ${editor.isActive('strike') ? active : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </button>
      <button
        className={`${btn} ${editor.isActive('code') ? active : ''}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </button>
      <button
        className={`${btn} ${editor.isActive('highlight') ? active : ''}`}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={16} />
      </button>
      <button
        className={`${btn} ${editor.isActive('link') ? active : ''}`}
        onClick={() => {
          const prev = editor.getAttributes('link').href as string | undefined
          const url = window.prompt('URL do link:', prev ?? '')
          if (url === null) return
          if (url === '') editor.chain().focus().unsetLink().run()
          else editor.chain().focus().setLink({ href: url }).run()
        }}
      >
        <LinkIcon size={16} />
      </button>
    </BubbleMenu>
  )
}
