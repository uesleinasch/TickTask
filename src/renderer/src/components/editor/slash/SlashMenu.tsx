import { useEffect, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'
import type { PopupComponentProps } from '../suggestionPopup'

export interface SlashItem {
  title: string
  command: (props: { editor: Editor; range: Range }) => void
}

export function SlashMenu(props: PopupComponentProps<SlashItem>): React.JSX.Element {
  const { items, command, registerKeyHandler } = props
  const [index, setIndex] = useState(0)

  useEffect(() => setIndex(0), [items])

  useEffect(() => {
    registerKeyHandler((e) => {
      if (!items.length) return false
      if (e.key === 'ArrowDown') {
        setIndex((i) => (i + 1) % items.length)
        return true
      }
      if (e.key === 'ArrowUp') {
        setIndex((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (e.key === 'Enter') {
        const it = items[index]
        if (it) command(it)
        return true
      }
      return false
    })
  }, [items, index, command, registerKeyHandler])

  if (!items.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-500 shadow-md">
        Nenhum comando
      </div>
    )
  }
  return (
    <div className="w-56 rounded-md border border-slate-200 bg-white p-1 shadow-md">
      {items.map((it, i) => (
        <button
          key={it.title}
          className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
            i === index ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
          }`}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(it)}
        >
          {it.title}
        </button>
      ))}
    </div>
  )
}
