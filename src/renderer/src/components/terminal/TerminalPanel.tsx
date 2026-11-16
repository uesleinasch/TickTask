import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Maximize2, Minimize2, Plus, RotateCcw, SquareTerminal, X } from 'lucide-react'
import type { TerminalSession } from '@shared/types'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_HEIGHT_KEY } from '@renderer/lib/terminalPrefs'
import { cn } from '@renderer/lib/utils'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { TerminalView } from './TerminalView'
import { TERMINAL_MAXIMIZE_SHORTCUT_LABEL, terminalShortcut } from './terminalKeys'

const MIN_HEIGHT = 120
const BUSY_POLL_MS = 2000

function clampHeight(height: number): number {
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight * 0.7))
}

function tabLabels(sessions: TerminalSession[]): Map<string, string> {
  const labels = new Map<string, string>()
  const seen = new Map<number, number>()
  for (const session of sessions) {
    const count = sessions.filter((s) => s.taskId === session.taskId).length
    const index = (seen.get(session.taskId) ?? 0) + 1
    seen.set(session.taskId, index)
    labels.set(session.id, count > 1 ? `${session.taskName} (${index})` : session.taskName)
  }
  return labels
}

export function TerminalPanel(): React.JSX.Element | null {
  const sessions = useTerminalStore((s) => s.sessions)
  const activeId = useTerminalStore((s) => s.activeId)
  const open = useTerminalStore((s) => s.open)
  const maximized = useTerminalStore((s) => s.maximized)
  const [height, setHeight] = usePersistedState(TERMINAL_HEIGHT_KEY, 280)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [pendingClose, setPendingClose] = useState<TerminalSession | null>(null)

  useEffect(() => {
    const store = useTerminalStore.getState()
    void store.refresh()
    const offExit = window.api.onTerminalExit((id, code) => store.markExited(id, code))
    const offRemoved = window.api.onTerminalRemoved((id) => store.forget(id))
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = terminalShortcut(event)
      if (!shortcut) return
      event.preventDefault()
      const state = useTerminalStore.getState()
      if (state.sessions.length === 0) return
      if (shortcut === 'toggle') state.toggle()
      else state.toggleMaximized()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      offExit()
      offRemoved()
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const interval = window.setInterval(
      () => void useTerminalStore.getState().refresh(),
      BUSY_POLL_MS
    )
    return () => window.clearInterval(interval)
  }, [open])

  const labels = useMemo(() => tabLabels(sessions), [sessions])
  const active = sessions.find((s) => s.id === activeId) ?? null

  if (!open || !active) return null

  const requestClose = async (session: TerminalSession): Promise<void> => {
    const fresh = (await window.api.terminalList()).find((s) => s.id === session.id)
    if (fresh?.busy) setPendingClose(fresh)
    else await useTerminalStore.getState().close(session.id)
  }

  const startResize = (event: React.MouseEvent): void => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = height
    let latest = startHeight
    const onMove = (move: MouseEvent): void => {
      latest = clampHeight(startHeight + startY - move.clientY)
      setDragHeight(latest)
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragHeight(null)
      setHeight(latest)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <section
      className={cn(
        'flex flex-col bg-slate-900',
        maximized ? 'fixed inset-0 z-40' : 'relative shrink-0 border-t border-slate-700'
      )}
      style={maximized ? undefined : { height: clampHeight(dragHeight ?? height) }}
    >
      {!maximized && (
        <div
          onMouseDown={startResize}
          title="Arraste para redimensionar o terminal"
          className="absolute left-0 top-0 z-20 w-full h-1.5 -mt-[3px] cursor-row-resize hover:bg-orange-500/60 transition-colors"
        />
      )}
      <div className="flex items-center h-9 shrink-0 border-b border-slate-800 pl-2 pr-1 gap-1">
        <SquareTerminal size={14} className="text-orange-400 shrink-0 mr-1" />
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => useTerminalStore.getState().activate(session.id)}
              className={cn(
                'group flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md text-xs cursor-pointer shrink-0 max-w-56',
                session.id === active.id
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              {session.busy && (
                <span
                  title="Processo em execução"
                  className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0"
                />
              )}
              <span
                className={cn('truncate', session.exitCode !== null && 'line-through opacity-60')}
              >
                {labels.get(session.id)}
              </span>
              <button
                type="button"
                title="Encerrar terminal"
                onClick={(event) => {
                  event.stopPropagation()
                  void requestClose(session)
                }}
                className="flex items-center justify-center h-5 w-5 rounded text-slate-500 hover:text-slate-100 hover:bg-slate-700"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            title="Novo terminal para esta task"
            onClick={() => void useTerminalStore.getState().createSession(active.taskId)}
            className="flex items-center justify-center h-7 w-7 shrink-0 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <Plus size={14} />
          </button>
        </div>
        {active.exitCode !== null && (
          <button
            type="button"
            onClick={() => void useTerminalStore.getState().restart(active.id)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-orange-300 hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            Reiniciar
          </button>
        )}
        <button
          type="button"
          title={`${maximized ? 'Restaurar' : 'Tela cheia'} (${TERMINAL_MAXIMIZE_SHORTCUT_LABEL})`}
          onClick={() => useTerminalStore.getState().toggleMaximized()}
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          type="button"
          title="Minimizar (os processos continuam rodando)"
          onClick={() => useTerminalStore.getState().setOpen(false)}
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <TerminalView key={active.id} session={active} />
      </div>

      <DeleteConfirmDialog
        open={pendingClose !== null}
        onOpenChange={(next) => !next && setPendingClose(null)}
        onConfirm={() => {
          if (pendingClose) void useTerminalStore.getState().close(pendingClose.id)
          setPendingClose(null)
        }}
        title="Encerrar terminal?"
        description="Há um processo rodando neste terminal. Encerrar mata o processo; o diretório de trabalho continua vinculado à task."
        confirmLabel="Encerrar"
      />
    </section>
  )
}
