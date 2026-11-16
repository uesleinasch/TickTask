// Pela tecla física à esquerda do 1 (`code`), não pelo caractere: no ABNT2 ela produz ' e no US
// produz `, e o atalho precisa ser o mesmo nos dois.
export type TerminalShortcut = 'toggle' | 'maximize'

type KeyInfo = Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey' | 'code' | 'key'>

export function terminalShortcut(event: KeyInfo): TerminalShortcut | null {
  if (!event.ctrlKey || event.altKey || event.metaKey || event.code !== 'Backquote') return null
  return event.shiftKey ? 'maximize' : 'toggle'
}

// ESC + CR é o "Alt+Enter" que TUIs como o Claude Code e o readline tratam como nova linha sem
// enviar; o xterm manda só CR no Shift+Enter, igual ao Enter.
export const SHIFT_ENTER_SEQUENCE = '\x1b\r'

export function isShiftEnter(event: KeyInfo): boolean {
  return (
    event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey
  )
}

export const TERMINAL_SHORTCUT_LABEL = "Ctrl + '"
export const TERMINAL_MAXIMIZE_SHORTCUT_LABEL = "Ctrl + Shift + '"
