import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { TerminalSession } from '@shared/types'
import { toast } from '@renderer/components/ui/sonner'
import { readTerminalAutoTimer } from '@renderer/lib/terminalPrefs'
import { useTimerStore } from '@renderer/stores/timerStore'
import { SHIFT_ENTER_SEQUENCE, isShiftEnter, terminalShortcut } from './terminalKeys'

const THEME = {
  background: '#0f172a',
  foreground: '#e2e8f0',
  cursor: '#f97316',
  cursorAccent: '#0f172a',
  selectionBackground: '#334155',
  black: '#1e293b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e2e8f0',
  brightBlack: '#64748b',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#f8fafc'
}

const timerTriggered = new Set<string>()

function exitMessage(exitCode: number): string {
  return `\r\n\x1b[90m[processo encerrado — código ${exitCode}]\x1b[0m\r\n`
}

function startTimerFromTerminal(session: TerminalSession): void {
  if (timerTriggered.has(session.id)) return
  timerTriggered.add(session.id)
  if (!readTerminalAutoTimer()) return
  const timers = useTimerStore.getState()
  if (timers.timers[session.taskId]) return
  void timers.startTimer(session.taskId).then(() => {
    toast.success(`Timer iniciado: ${session.taskName}`, {
      description: 'O primeiro comando no terminal começou a contar o tempo.',
      action: {
        label: 'Parar',
        onClick: () => void useTimerStore.getState().stopTimer(session.taskId)
      }
    })
  })
}

export function TerminalView({ session }: { session: TerminalSession }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const id = session.id
    const terminal = new Terminal({
      theme: THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.attachCustomKeyEventHandler((event) => {
      if (isShiftEnter(event)) {
        if (event.type === 'keydown') void window.api.terminalWrite(id, SHIFT_ENTER_SEQUENCE)
        return false
      }
      return terminalShortcut(event) === null
    })
    terminal.open(container)

    let disposed = false
    let replayedSeq: number | null = null
    const queued: Array<{ chunk: string; seq: number }> = []

    const offData = window.api.onTerminalData((sessionId, chunk, seq) => {
      if (sessionId !== id) return
      if (replayedSeq === null) queued.push({ chunk, seq })
      else if (seq > replayedSeq) terminal.write(chunk)
    })
    const offExit = window.api.onTerminalExit((sessionId, exitCode) => {
      if (sessionId === id) terminal.write(exitMessage(exitCode))
    })

    void window.api.terminalGetBuffer(id).then((buffer) => {
      if (disposed) return
      replayedSeq = buffer?.seq ?? 0
      if (buffer?.data) terminal.write(buffer.data)
      for (const item of queued) if (item.seq > replayedSeq) terminal.write(item.chunk)
      queued.length = 0
      if (sessionRef.current.exitCode !== null) {
        terminal.write(exitMessage(sessionRef.current.exitCode))
      }
    })

    const input = terminal.onData((data) => {
      void window.api.terminalWrite(id, data)
      if (data.includes('\r')) startTimerFromTerminal(sessionRef.current)
    })
    const resize = terminal.onResize(({ cols, rows }) => {
      void window.api.terminalResize(id, cols, rows)
    })

    const refit = (): void => {
      if (container.clientWidth > 0 && container.clientHeight > 0) fit.fit()
    }
    const observer = new ResizeObserver(refit)
    observer.observe(container)
    refit()
    void window.api.terminalResize(id, terminal.cols, terminal.rows)
    terminal.focus()

    return () => {
      disposed = true
      observer.disconnect()
      input.dispose()
      resize.dispose()
      offData()
      offExit()
      terminal.dispose()
    }
  }, [session.id])

  return (
    <div className="h-full w-full px-2 pt-1">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
