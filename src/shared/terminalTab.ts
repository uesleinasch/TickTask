export const TERMINAL_TAB_ICONS = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'server', label: 'Servidor' },
  { id: 'database', label: 'Banco de dados' },
  { id: 'globe', label: 'Web' },
  { id: 'code', label: 'Código' },
  { id: 'bug', label: 'Debug' },
  { id: 'flask', label: 'Testes' },
  { id: 'rocket', label: 'Deploy' },
  { id: 'package', label: 'Build' },
  { id: 'git', label: 'Git' },
  { id: 'cloud', label: 'Nuvem' },
  { id: 'bot', label: 'Agente' }
] as const

export type TerminalTabIcon = (typeof TERMINAL_TAB_ICONS)[number]['id']

const ICON_IDS = new Set<string>(TERMINAL_TAB_ICONS.map((icon) => icon.id))

export function normalizeTabIcon(icon: string | null): TerminalTabIcon | null {
  return icon !== null && ICON_IDS.has(icon) ? (icon as TerminalTabIcon) : null
}

export function normalizeTabColor(color: string | null): string | null {
  return color !== null && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null
}
