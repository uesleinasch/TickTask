// Pela tecla física à esquerda do 1 (`code`), não pelo caractere: no ABNT2 ela produz ' e no US
// produz `, e o atalho precisa ser o mesmo nos dois.
export type TerminalShortcut = 'toggle' | 'maximize'

export function terminalShortcut(event: KeyboardEvent): TerminalShortcut | null {
  if (!event.ctrlKey || event.altKey || event.metaKey || event.code !== 'Backquote') return null
  return event.shiftKey ? 'maximize' : 'toggle'
}

export const TERMINAL_SHORTCUT_LABEL = "Ctrl + '"
export const TERMINAL_MAXIMIZE_SHORTCUT_LABEL = "Ctrl + Shift + '"
