import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Columns2,
  PanelRight,
  PanelRightClose,
  Palette,
  Shapes,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  SquareTerminal,
  Undo2,
  X
} from 'lucide-react'
import type { TerminalSession } from '@shared/types'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@renderer/components/ui/context-menu'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_HEIGHT_KEY, TERMINAL_SPLIT_RATIO_KEY } from '@renderer/lib/terminalPrefs'
import { cn } from '@renderer/lib/utils'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { DEFAULT_COLORS } from '@renderer/lib/colors'
import { TERMINAL_TAB_ICONS } from '@shared/terminalTab'
import { TAB_ICON_COMPONENTS } from './tabIcons'
import { TerminalView } from './TerminalView'
import { TERMINAL_MAXIMIZE_SHORTCUT_LABEL, terminalShortcut } from './terminalKeys'

const MIN_HEIGHT = 120
const MIN_SPLIT = 0.2
const BUSY_POLL_MS = 2000

function clampHeight(height: number): number {
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight * 0.7))
}

function defaultTabLabels(sessions: TerminalSession[]): Map<string, string> {
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

function TabTitleInput({
  initial,
  onDone
}: {
  initial: string
  onDone: (value: string | null) => void
}): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const finish = (value: string | null): void => {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <input
      ref={ref}
      defaultValue={initial}
      maxLength={60}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(event.currentTarget.value)
        if (event.key === 'Escape') finish(null)
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
      className="h-5 w-32 rounded bg-slate-950 px-1 text-xs text-slate-100 outline-none ring-1 ring-orange-400/70"
    />
  )
}

function PaneHeader({
  session,
  label,
  onClose
}: {
  session: TerminalSession
  label: string
  onClose?: () => void
}): React.JSX.Element {
  const Icon = session.icon ? TAB_ICON_COMPONENTS[session.icon] : SquareTerminal
  return (
    <div
      className="flex items-center gap-1.5 h-6 shrink-0 px-2 text-[11px] text-slate-400 border-b border-slate-800"
      style={session.color ? { boxShadow: `inset 0 -1px 0 ${session.color}` } : undefined}
    >
      <Icon size={12} className="shrink-0" style={{ color: session.color ?? undefined }} />
      <span className={cn('truncate', session.exitCode !== null && 'line-through opacity-60')}>
        {label}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {session.exitCode !== null && (
          <button
            type="button"
            onClick={() => void useTerminalStore.getState().restart(session.id)}
            className="flex items-center gap-1 h-5 px-1.5 rounded text-orange-300 hover:bg-slate-800"
          >
            <RotateCcw size={11} />
            Reiniciar
          </button>
        )}
        {onClose && (
          <button
            type="button"
            title="Fechar a divisão (o terminal continua na aba)"
            onClick={onClose}
            className="flex items-center justify-center h-5 w-5 rounded text-slate-500 hover:text-slate-100 hover:bg-slate-700"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

export function TerminalPanel(): React.JSX.Element | null {
  const sessions = useTerminalStore((s) => s.sessions)
  const activeId = useTerminalStore((s) => s.activeId)
  const splitId = useTerminalStore((s) => s.splitId)
  const [splitRatio, setSplitRatio] = usePersistedState(TERMINAL_SPLIT_RATIO_KEY, 0.5)
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const panesRef = useRef<HTMLDivElement>(null)
  const open = useTerminalStore((s) => s.open)
  const maximized = useTerminalStore((s) => s.maximized)
  const [height, setHeight] = usePersistedState(TERMINAL_HEIGHT_KEY, 280)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [pendingClose, setPendingClose] = useState<TerminalSession | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const defaultLabels = useMemo(() => defaultTabLabels(sessions), [sessions])
  const labelOf = (session: TerminalSession): string =>
    session.title ?? defaultLabels.get(session.id) ?? session.taskName

  const finishRename = (session: TerminalSession, value: string | null): void => {
    setEditingId(null)
    if (value === null || value.trim() === labelOf(session)) return
    const title = value.trim() === defaultLabels.get(session.id) ? null : value
    void useTerminalStore.getState().customize(session.id, { title })
  }
  const active = sessions.find((s) => s.id === activeId) ?? null
  const split = sessions.find((s) => s.id === splitId) ?? null

  if (!open || !active) return null

  const requestClose = async (session: TerminalSession): Promise<void> => {
    const fresh = (await window.api.terminalList()).find((s) => s.id === session.id)
    if (fresh?.busy) setPendingClose(fresh)
    else await useTerminalStore.getState().close(session.id)
  }

  const startSplitResize = (event: React.MouseEvent): void => {
    event.preventDefault()
    const container = panesRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    let latest = splitRatio
    const onMove = (move: MouseEvent): void => {
      const ratio = (move.clientX - rect.left) / rect.width
      latest = Math.min(Math.max(ratio, MIN_SPLIT), 1 - MIN_SPLIT)
      setDragRatio(latest)
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragRatio(null)
      setSplitRatio(latest)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
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
          {sessions.map((session) => {
            const TabIcon = session.icon ? TAB_ICON_COMPONENTS[session.icon] : null
            return (
              <ContextMenu key={session.id} modal={false}>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() => useTerminalStore.getState().activate(session.id)}
                    className={cn(
                      'group flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md text-xs cursor-pointer shrink-0 max-w-56',
                      session.id === active.id || session.id === split?.id
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )}
                    style={
                      session.color ? { boxShadow: `inset 0 -2px 0 ${session.color}` } : undefined
                    }
                  >
                    {TabIcon && (
                      <TabIcon
                        size={13}
                        className="shrink-0"
                        style={{ color: session.color ?? undefined }}
                      />
                    )}
                    {session.busy && (
                      <span
                        title="Processo em execução"
                        className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0"
                      />
                    )}
                    {editingId === session.id ? (
                      <TabTitleInput
                        initial={labelOf(session)}
                        onDone={(value) => finishRename(session, value)}
                      />
                    ) : (
                      <span
                        title="Clique duas vezes para renomear"
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          setEditingId(session.id)
                        }}
                        className={cn(
                          'truncate',
                          session.exitCode !== null && 'line-through opacity-60'
                        )}
                      >
                        {labelOf(session)}
                      </span>
                    )}
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
                </ContextMenuTrigger>
                <ContextMenuContent
                  className="w-48"
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <ContextMenuItem onSelect={() => setEditingId(session.id)}>
                    <Pencil /> Renomear
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={session.title === null}
                    onSelect={() =>
                      void useTerminalStore.getState().customize(session.id, { title: null })
                    }
                  >
                    <Undo2 /> Restaurar nome
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={session.id === active.id || session.id === split?.id}
                    onSelect={() => useTerminalStore.getState().openSplit(session.id)}
                  >
                    <PanelRight /> Abrir à direita
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Palette /> Cor
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-40">
                      <ContextMenuRadioGroup
                        value={session.color ?? 'none'}
                        onValueChange={(value) =>
                          void useTerminalStore
                            .getState()
                            .customize(session.id, { color: value === 'none' ? null : value })
                        }
                      >
                        <ContextMenuRadioItem value="none">Sem cor</ContextMenuRadioItem>
                        {DEFAULT_COLORS.map((color) => (
                          <ContextMenuRadioItem key={color} value={color}>
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                          </ContextMenuRadioItem>
                        ))}
                      </ContextMenuRadioGroup>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Shapes /> Ícone
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-44">
                      <ContextMenuRadioGroup
                        value={session.icon ?? 'none'}
                        onValueChange={(value) =>
                          void useTerminalStore
                            .getState()
                            .customize(session.id, { icon: value === 'none' ? null : value })
                        }
                      >
                        <ContextMenuRadioItem value="none">Sem ícone</ContextMenuRadioItem>
                        {TERMINAL_TAB_ICONS.map(({ id, label }) => {
                          const Icon = TAB_ICON_COMPONENTS[id]
                          return (
                            <ContextMenuRadioItem key={id} value={id}>
                              <Icon /> {label}
                            </ContextMenuRadioItem>
                          )
                        })}
                      </ContextMenuRadioGroup>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
          <button
            type="button"
            title="Novo terminal para esta task"
            onClick={() => void useTerminalStore.getState().createSession(active.taskId)}
            className="flex items-center justify-center h-7 w-7 shrink-0 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <Plus size={14} />
          </button>
        </div>
        {!split && active.exitCode !== null && (
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
          title={
            split
              ? 'Fechar a divisão (o terminal continua na aba)'
              : 'Dividir: novo terminal à direita'
          }
          onClick={() => {
            const store = useTerminalStore.getState()
            if (split) store.closeSplit()
            else void store.splitNew(active.taskId)
          }}
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          {split ? <PanelRightClose size={14} /> : <Columns2 size={14} />}
        </button>
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
      {split ? (
        <div ref={panesRef} className="flex-1 min-h-0 flex">
          <div
            className="min-w-0 flex flex-col"
            style={{ width: `${(dragRatio ?? splitRatio) * 100}%` }}
          >
            <PaneHeader session={active} label={labelOf(active)} />
            <div className="flex-1 min-h-0">
              <TerminalView key={active.id} session={active} />
            </div>
          </div>
          <div
            onMouseDown={startSplitResize}
            title="Arraste para redimensionar os painéis"
            className="w-1 shrink-0 cursor-col-resize bg-slate-800 hover:bg-orange-500/60 transition-colors"
          />
          <div className="flex-1 min-w-0 flex flex-col">
            <PaneHeader
              session={split}
              label={labelOf(split)}
              onClose={() => useTerminalStore.getState().closeSplit()}
            />
            <div className="flex-1 min-h-0">
              <TerminalView key={split.id} session={split} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <TerminalView key={active.id} session={active} />
        </div>
      )}

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
