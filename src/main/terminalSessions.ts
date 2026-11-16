import type { TerminalBuffer, TerminalSession, TerminalTabCustomization } from '@shared/types'
import { normalizeTabColor, normalizeTabIcon } from '@shared/terminalTab'

export interface PtyLike {
  readonly process: string
  onData(listener: (data: string) => void): unknown
  onExit(listener: (event: { exitCode: number }) => void): unknown
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

export type SpawnPty = (
  shell: string,
  args: string[],
  options: { name: string; cwd: string; cols: number; rows: number; env: Record<string, string> }
) => PtyLike

export interface TerminalEvents {
  data: (sessionId: string, chunk: string, seq: number) => void
  exit: (sessionId: string, exitCode: number) => void
  removed: (sessionId: string) => void
}

export interface TerminalManagerDeps {
  spawn: SpawnPty
  events: TerminalEvents
  env: Record<string, string>
  flushMs?: number
  bufferLimit?: number
}

export interface CreateSessionInput {
  taskId: number
  taskName: string
  cwd: string
  shell: string
  startCommand?: string | null
  cols?: number
  rows?: number
}

export class RingBuffer {
  private chunks: string[] = []
  private size = 0

  constructor(private readonly limit: number) {}

  push(chunk: string): void {
    this.chunks.push(chunk)
    this.size += chunk.length
    while (this.size > this.limit) {
      const excess = this.size - this.limit
      const head = this.chunks[0]
      if (head.length <= excess) {
        this.chunks.shift()
        this.size -= head.length
      } else {
        this.chunks[0] = head.slice(excess)
        this.size -= excess
      }
    }
  }

  toString(): string {
    return this.chunks.join('')
  }
}

interface Session {
  info: Omit<TerminalSession, 'busy' | 'exitCode'>
  pty: PtyLike
  shellName: string
  buffer: RingBuffer
  pending: string
  timer: ReturnType<typeof setTimeout> | null
  seq: number
  exitCode: number | null
}

const TAB_TITLE_MAX = 60

export function normalizeTabTitle(title: string | null): string | null {
  const trimmed = (title ?? '').trim().slice(0, TAB_TITLE_MAX)
  return trimmed || null
}

export function shellBasename(shell: string): string {
  return (
    shell
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.exe$/i, '') ?? shell
  )
}

export class TerminalManager {
  private readonly sessions = new Map<string, Session>()
  private counter = 0
  private readonly flushMs: number
  private readonly bufferLimit: number

  constructor(private readonly deps: TerminalManagerDeps) {
    this.flushMs = deps.flushMs ?? 10
    this.bufferLimit = deps.bufferLimit ?? 200_000
  }

  create(input: CreateSessionInput): TerminalSession {
    const id = `${input.taskId}-${++this.counter}`
    const pty = this.deps.spawn(input.shell, [], {
      name: 'xterm-256color',
      cwd: input.cwd,
      cols: input.cols ?? 80,
      rows: input.rows ?? 24,
      env: { ...this.deps.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
    })
    const session: Session = {
      info: {
        id,
        taskId: input.taskId,
        taskName: input.taskName,
        cwd: input.cwd,
        shell: input.shell,
        title: null,
        color: null,
        icon: null
      },
      pty,
      shellName: shellBasename(input.shell),
      buffer: new RingBuffer(this.bufferLimit),
      pending: '',
      timer: null,
      seq: 0,
      exitCode: null
    }
    this.sessions.set(id, session)

    pty.onData((data) => {
      session.pending += data
      if (!session.timer) session.timer = setTimeout(() => this.flush(session), this.flushMs)
    })
    pty.onExit(({ exitCode }) => {
      this.flush(session)
      session.exitCode = exitCode
      if (this.sessions.get(id) === session) this.deps.events.exit(id, exitCode)
    })

    const startCommand = input.startCommand?.trim()
    if (startCommand) pty.write(`${startCommand}\r`)
    return this.describe(session)
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id)
    if (session && session.exitCode === null) session.pty.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id)
    if (!session || session.exitCode !== null) return
    if (cols > 0 && rows > 0) session.pty.resize(Math.floor(cols), Math.floor(rows))
  }

  getBuffer(id: string): TerminalBuffer | null {
    const session = this.sessions.get(id)
    if (!session) return null
    return { data: session.buffer.toString(), seq: session.seq }
  }

  customize(id: string, patch: TerminalTabCustomization): TerminalSession | null {
    const session = this.sessions.get(id)
    if (!session) return null
    if (patch.title !== undefined) session.info.title = normalizeTabTitle(patch.title)
    if (patch.color !== undefined) session.info.color = normalizeTabColor(patch.color)
    if (patch.icon !== undefined) session.info.icon = normalizeTabIcon(patch.icon)
    return this.describe(session)
  }

  list(): TerminalSession[] {
    return [...this.sessions.values()].map((session) => this.describe(session))
  }

  dispose(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    this.sessions.delete(id)
    if (session.timer) clearTimeout(session.timer)
    if (session.exitCode === null) {
      try {
        session.pty.kill()
      } catch {
        /* processo já morreu */
      }
    }
    this.deps.events.removed(id)
  }

  disposeForTasks(taskIds: number[]): void {
    const ids = new Set(taskIds)
    for (const session of [...this.sessions.values()]) {
      if (ids.has(session.info.taskId)) this.dispose(session.info.id)
    }
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) this.dispose(id)
  }

  private flush(session: Session): void {
    if (session.timer) clearTimeout(session.timer)
    session.timer = null
    if (!session.pending) return
    const chunk = session.pending
    session.pending = ''
    session.buffer.push(chunk)
    session.seq += 1
    if (this.sessions.get(session.info.id) === session) {
      this.deps.events.data(session.info.id, chunk, session.seq)
    }
  }

  private describe(session: Session): TerminalSession {
    let busy = false
    if (session.exitCode === null) {
      try {
        busy = shellBasename(session.pty.process) !== session.shellName
      } catch {
        busy = false
      }
    }
    return { ...session.info, busy, exitCode: session.exitCode }
  }
}

export function defaultShell(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>
): string {
  if (platform === 'win32') return 'powershell.exe'
  return env.SHELL || (platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
}

export function resolveShell(
  preferred: string | null | undefined,
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  isExecutable: (path: string) => boolean
): { shell: string; fellBack: boolean } {
  const fallback = defaultShell(platform, env)
  const wanted = preferred?.trim()
  if (!wanted) return { shell: fallback, fellBack: false }
  if (platform === 'win32' && !/[\\/]/.test(wanted)) return { shell: wanted, fellBack: false }
  if (isExecutable(wanted)) return { shell: wanted, fellBack: false }
  return { shell: fallback, fellBack: true }
}
