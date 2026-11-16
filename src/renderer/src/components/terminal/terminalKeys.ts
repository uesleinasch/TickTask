// Pela tecla física à esquerda do 1 (`code`), não pelo caractere: no ABNT2 ela produz ' e no US
// produz `, e o atalho precisa ser o mesmo nos dois.
export function isTerminalToggleKey(event: KeyboardEvent): boolean {
  return event.ctrlKey && !event.altKey && !event.metaKey && event.code === 'Backquote'
}

export const TERMINAL_SHORTCUT_LABEL = "Ctrl + '"
