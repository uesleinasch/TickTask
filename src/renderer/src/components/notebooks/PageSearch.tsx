import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { PageSearchResult } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { UNTITLED_PAGE } from './notebookUi'

const DEBOUNCE_MS = 250

interface PageSearchProps {
  onOpen: (pageId: number) => void
}

export function PageSearch({ onOpen }: PageSearchProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PageSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      window.api
        .searchPages(q)
        .then((items) => {
          if (cancelled) return
          setResults(items)
          setActive(0)
        })
        .catch((e) => console.error('Falha na busca de páginas:', e))
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = (result: PageSearchResult): void => {
    setOpen(false)
    setQuery('')
    onOpen(result.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    }
  }

  const showPanel = open && query.trim().length > 0

  return (
    <div ref={boxRef} className="relative w-80">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar nas páginas..."
        className="w-full h-9 pl-8 pr-8 rounded-sm border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          title="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
        >
          <X size={13} />
        </button>
      )}
      {showPanel && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[420px] max-h-96 overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg py-1">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-400">Nenhuma página encontrada.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(result)}
                className={cn(
                  'w-full text-left px-3 py-2 flex flex-col gap-0.5',
                  index === active ? 'bg-slate-100' : 'hover:bg-slate-50'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: result.notebook_color }}
                  />
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      result.title ? 'text-slate-900' : 'italic text-slate-400'
                    )}
                  >
                    {result.title || UNTITLED_PAGE}
                  </span>
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {result.notebook_name} › {result.section_name}
                </span>
                {result.snippet && (
                  <span className="text-xs text-slate-600 line-clamp-2">{result.snippet}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
