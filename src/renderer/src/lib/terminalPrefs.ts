export const TERMINAL_SHELL_KEY = 'terminal.shell'
export const TERMINAL_AUTO_TIMER_KEY = 'terminal.autoTimer'
export const TERMINAL_HEIGHT_KEY = 'terminal.height'

function read<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    return stored !== null ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

export const readTerminalShell = (): string => read(TERMINAL_SHELL_KEY, '')
export const readTerminalAutoTimer = (): boolean => read(TERMINAL_AUTO_TIMER_KEY, true)
export const TERMINAL_SPLIT_RATIO_KEY = 'terminal.splitRatio'
