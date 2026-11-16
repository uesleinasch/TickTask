import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RingBuffer,
  TerminalManager,
  defaultShell,
  normalizeTabTitle,
  resolveShell,
  shellBasename,
  type PtyLike,
  type SpawnPty
} from './terminalSessions'

class FakePty implements PtyLike {
  process = 'bash'
  written: string[] = []
  killed = 0
  resized: Array<[number, number]> = []
  private dataListener: (data: string) => void = () => {}
  private exitListener: (event: { exitCode: number }) => void = () => {}

  onData(listener: (data: string) => void): void {
    this.dataListener = listener
  }
  onExit(listener: (event: { exitCode: number }) => void): void {
    this.exitListener = listener
  }
  write(data: string): void {
    this.written.push(data)
  }
  resize(cols: number, rows: number): void {
    this.resized.push([cols, rows])
  }
  kill(): void {
    this.killed += 1
  }
  emit(data: string): void {
    this.dataListener(data)
  }
  exit(code: number): void {
    this.exitListener({ exitCode: code })
  }
}

function setup(): {
  manager: TerminalManager
  ptys: FakePty[]
  spawn: ReturnType<typeof vi.fn>
  events: {
    data: ReturnType<typeof vi.fn>
    exit: ReturnType<typeof vi.fn>
    removed: ReturnType<typeof vi.fn>
  }
} {
  const ptys: FakePty[] = []
  const spawn = vi.fn<SpawnPty>(() => {
    const pty = new FakePty()
    ptys.push(pty)
    return pty
  })
  const events = { data: vi.fn(), exit: vi.fn(), removed: vi.fn() }
  const manager = new TerminalManager({
    spawn,
    events,
    env: { PATH: '/usr/bin' },
    flushMs: 10,
    bufferLimit: 20
  })
  return { manager, ptys, spawn, events }
}

const input = { taskId: 7, taskName: 'Deploy', cwd: '/repo', shell: '/bin/bash' }

describe('RingBuffer', () => {
  it('acumula e corta pelo início ao passar do teto', () => {
    const buffer = new RingBuffer(5)
    buffer.push('abc')
    buffer.push('defg')
    expect(buffer.toString()).toBe('cdefg')
    buffer.push('hijklmn')
    expect(buffer.toString()).toBe('jklmn')
  })
})

describe('TerminalManager', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('cria a sessão no cwd da task e escreve o comando inicial', () => {
    const { manager, ptys, spawn } = setup()
    const session = manager.create({ ...input, startCommand: ' npm run dev ' })

    expect(spawn).toHaveBeenCalledWith(
      '/bin/bash',
      [],
      expect.objectContaining({ cwd: '/repo', env: expect.objectContaining({ PATH: '/usr/bin' }) })
    )
    expect(ptys[0].written).toEqual(['npm run dev\r'])
    expect(session).toMatchObject({ id: '7-1', taskId: 7, busy: false, exitCode: null })
  })

  it('agrupa rajadas de output num único envio', () => {
    const { manager, ptys, events } = setup()
    const { id } = manager.create(input)
    ptys[0].emit('a')
    ptys[0].emit('b')
    ptys[0].emit('c')
    expect(events.data).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10)
    expect(events.data).toHaveBeenCalledTimes(1)
    expect(events.data).toHaveBeenCalledWith(id, 'abc', 1)
  })

  it('guarda no buffer só o que já foi enviado, com a sequência do último envio', () => {
    const { manager, ptys } = setup()
    const { id } = manager.create(input)
    ptys[0].emit('primeiro')
    vi.advanceTimersByTime(10)
    ptys[0].emit('pendente')

    expect(manager.getBuffer(id)).toEqual({ data: 'primeiro', seq: 1 })
  })

  it('respeita o teto do buffer no replay', () => {
    const { manager, ptys } = setup()
    const { id } = manager.create(input)
    ptys[0].emit('0123456789')
    vi.advanceTimersByTime(10)
    ptys[0].emit('abcdefghijklmno')
    vi.advanceTimersByTime(10)

    expect(manager.getBuffer(id)?.data).toBe('56789abcdefghijklmno')
  })

  it('no exit envia o que estava pendente, guarda o código e mantém o buffer', () => {
    const { manager, ptys, events } = setup()
    const { id } = manager.create(input)
    ptys[0].emit('tchau')
    ptys[0].exit(130)

    expect(events.data).toHaveBeenCalledWith(id, 'tchau', 1)
    expect(events.exit).toHaveBeenCalledWith(id, 130)
    expect(manager.list()[0]).toMatchObject({ exitCode: 130, busy: false })
    expect(manager.getBuffer(id)?.data).toBe('tchau')
  })

  it('marca busy quando o processo em foreground não é o shell', () => {
    const { manager, ptys } = setup()
    manager.create(input)
    ptys[0].process = 'node'
    expect(manager.list()[0].busy).toBe(true)
  })

  it('dispose mata o pty uma vez e é idempotente', () => {
    const { manager, ptys, events } = setup()
    const { id } = manager.create(input)
    manager.dispose(id)
    manager.dispose(id)

    expect(ptys[0].killed).toBe(1)
    expect(events.removed).toHaveBeenCalledTimes(1)
    expect(manager.getBuffer(id)).toBeNull()
  })

  it('não mata de novo um processo que já saiu', () => {
    const { manager, ptys } = setup()
    const { id } = manager.create(input)
    ptys[0].exit(0)
    manager.dispose(id)
    expect(ptys[0].killed).toBe(0)
  })

  it('ignora escrita e resize em sessão encerrada', () => {
    const { manager, ptys } = setup()
    const { id } = manager.create(input)
    ptys[0].exit(0)
    manager.write(id, 'ls\r')
    manager.resize(id, 100, 30)
    expect(ptys[0].written).toEqual([])
    expect(ptys[0].resized).toEqual([])
  })

  it('disposeForTasks só derruba as sessões das tasks informadas', () => {
    const { manager } = setup()
    manager.create(input)
    manager.create(input)
    const other = manager.create({ ...input, taskId: 9 })

    manager.disposeForTasks([7])
    expect(manager.list().map((s) => s.id)).toEqual([other.id])
  })

  it('customize renomeia a aba e o nome aparece na listagem', () => {
    const { manager } = setup()
    const session = manager.create(input)

    expect(session.title).toBeNull()
    expect(manager.customize(session.id, { title: '  API  ' })?.title).toBe('API')
    expect(manager.list()[0].title).toBe('API')
    expect(manager.customize(session.id, {})?.title).toBe('API')
    expect(manager.customize(session.id, { title: '' })?.title).toBeNull()
    expect(manager.customize('inexistente', { title: 'x' })).toBeNull()
  })

  it('customize troca cor e ícone sem mexer no nome e descarta valor inválido', () => {
    const { manager } = setup()
    const session = manager.create(input)
    manager.customize(session.id, { title: 'API' })

    const styled = manager.customize(session.id, { color: '#F97316', icon: 'rocket' })
    expect(styled).toMatchObject({ title: 'API', color: '#f97316', icon: 'rocket' })

    const invalid = manager.customize(session.id, { color: 'red', icon: 'skull' })
    expect(invalid).toMatchObject({ title: 'API', color: null, icon: null })
  })

  it('killAll derruba tudo', () => {
    const { manager, ptys } = setup()
    manager.create(input)
    manager.create({ ...input, taskId: 9 })
    manager.killAll()
    expect(manager.list()).toEqual([])
    expect(ptys.every((pty) => pty.killed === 1)).toBe(true)
  })

  it('não emite dados de sessão já descartada', () => {
    const { manager, ptys, events } = setup()
    const { id } = manager.create(input)
    ptys[0].emit('tarde')
    manager.dispose(id)
    vi.advanceTimersByTime(10)
    expect(events.data).not.toHaveBeenCalled()
  })
})

describe('shell', () => {
  it('usa $SHELL no Linux e PowerShell no Windows', () => {
    expect(defaultShell('linux', { SHELL: '/usr/bin/zsh' })).toBe('/usr/bin/zsh')
    expect(defaultShell('linux', {})).toBe('/bin/bash')
    expect(defaultShell('win32', { SHELL: '/bin/zsh' })).toBe('powershell.exe')
  })

  it('cai no default quando o shell configurado não existe', () => {
    const exists = (path: string): boolean => path === '/bin/fish'
    expect(resolveShell('/bin/fish', 'linux', {}, exists)).toEqual({
      shell: '/bin/fish',
      fellBack: false
    })
    expect(resolveShell('/nao/existe', 'linux', { SHELL: '/bin/zsh' }, exists)).toEqual({
      shell: '/bin/zsh',
      fellBack: true
    })
    expect(resolveShell('  ', 'linux', { SHELL: '/bin/zsh' }, exists)).toEqual({
      shell: '/bin/zsh',
      fellBack: false
    })
  })

  it('compara o nome do processo sem caminho nem .exe', () => {
    expect(shellBasename('/usr/bin/zsh')).toBe('zsh')
    expect(shellBasename('C:\\Windows\\powershell.exe')).toBe('powershell')
  })
})

describe('normalizeTabTitle', () => {
  it('apara, limita a 60 caracteres e trata vazio como sem nome', () => {
    expect(normalizeTabTitle('  front  ')).toBe('front')
    expect(normalizeTabTitle('   ')).toBeNull()
    expect(normalizeTabTitle(null)).toBeNull()
    expect(normalizeTabTitle('x'.repeat(80))).toHaveLength(60)
  })
})
