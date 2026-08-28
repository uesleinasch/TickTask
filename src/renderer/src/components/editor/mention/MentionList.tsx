import { useEffect, useState } from 'react'
import type { PopupComponentProps } from '../suggestionPopup'

export interface MentionEntry {
  id: number
  label: string
  type: 'task' | 'project' | 'context'
}

const TYPE_LABEL: Record<MentionEntry['type'], string> = {
  task: 'Tarefa',
  project: 'Projeto',
  context: 'Contexto'
}

export function MentionList(props: PopupComponentProps<MentionEntry>): React.JSX.Element {
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
        Nada encontrado
      </div>
    )
  }
  return (
    <div className="w-64 rounded-md border border-slate-200 bg-white p-1 shadow-md">
      {items.map((it, i) => (
        <button
          key={`${it.type}-${it.id}`}
          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
            i === index ? 'bg-slate-100' : ''
          }`}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(it)}
        >
          <span className="truncate text-slate-800">{it.label}</span>
          <span className="ml-2 shrink-0 text-xs text-slate-400">{TYPE_LABEL[it.type]}</span>
        </button>
      ))}
    </div>
  )
}
