import { useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
  ALargeSmall
} from 'lucide-react'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px']

function FontSizePicker({ editor }: { editor: Editor }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const current = editor.getAttributes('textStyle').fontSize as string | undefined

  const apply = (size: string | null): void => {
    const chain = editor.chain().focus()
    if (size) chain.setFontSize(size).run()
    else chain.unsetFontSize().run()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        className={`p-1.5 rounded hover:bg-slate-100 text-slate-700 ${
          current ? 'bg-slate-200 text-slate-900' : ''
        }`}
        onClick={() => setOpen((v) => !v)}
        title="Tamanho da fonte"
      >
        <ALargeSmall size={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-28 rounded-md border border-slate-200 bg-white p-1">
          <button
            className={`block w-full rounded px-2 py-1 text-left text-sm ${
              current ? 'text-slate-700 hover:bg-slate-100' : 'bg-slate-100 text-slate-900'
            }`}
            onClick={() => apply(null)}
          >
            Padrão
          </button>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              className={`block w-full rounded px-2 py-1 text-left text-sm ${
                current === size
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => apply(size)}
            >
              {parseInt(size, 10)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
      <FontSizePicker editor={editor} />
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
