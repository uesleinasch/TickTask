import { useState, useCallback, useEffect, useRef } from 'react'
import { Inbox, X } from 'lucide-react'

export function QuickCapturePage(): React.JSX.Element {
  const [name, setName] = useState('')
  const [captured, setCaptured] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus no input ao abrir
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  const handleCapture = useCallback(async (): Promise<void> => {
    if (!name.trim()) return
    try {
      await window.api.quickCapture(name.trim())
      setCaptured(true)
      // Auto-fechar após 1.5 segundos
      setTimeout(() => {
        window.api.closeQuickCapture()
      }, 1500)
    } catch (error) {
      console.error('Erro ao capturar:', error)
    }
  }, [name])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCapture()
      } else if (e.key === 'Escape') {
        window.api.closeQuickCapture()
      }
    },
    [handleCapture]
  )

  const handleClose = useCallback((): void => {
    window.api.closeQuickCapture()
  }, [])

  if (captured) {
    return (
      <div className="w-full h-full bg-emerald-600 rounded-2xl flex items-center justify-center px-4 shadow-2xl"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3 text-white">
          <Inbox size={20} />
          <span className="text-sm font-medium">Capturado para Inbox!</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 text-slate-500">
          <Inbox size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Captura Rápida</span>
        </div>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={14} />
        </button>
      </div>

      {/* Input */}
      <div className="flex-1 px-4 pb-3 flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O que precisa ser feito?"
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400"
          autoFocus
        />
        <button
          onClick={handleCapture}
          disabled={!name.trim()}
          className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          Capturar
        </button>
      </div>

      {/* Hint */}
      <div className="px-4 pb-2">
        <p className="text-[10px] text-slate-400 text-center">
          Enter para capturar | Esc para fechar
        </p>
      </div>
    </div>
  )
}
