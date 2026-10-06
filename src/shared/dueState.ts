export type DueKind = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later'

export interface DueState {
  kind: DueKind
  days: number
  label: string
}

export function localDateString(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export function currentTime(now: Date): string {
  return now.toTimeString().slice(0, 5)
}

export function dueState(dueDate: string, dueTime: string | null | undefined, now: Date): DueState {
  const date = dueDate.slice(0, 10)
  const days = dayNumber(date) - dayNumber(localDateString(now))
  const withTime = (label: string): string => (dueTime ? `${label} ${dueTime}` : label)

  if (days < 0 || (days === 0 && dueTime && dueTime < currentTime(now))) {
    return { kind: 'overdue', days, label: 'Atrasada' }
  }
  if (days === 0) return { kind: 'today', days, label: withTime('Hoje') }
  if (days === 1) return { kind: 'tomorrow', days, label: withTime('Amanhã') }
  if (days <= 3) return { kind: 'soon', days, label: `${days}d` }
  const [, month, day] = date.split('-')
  return { kind: 'later', days, label: `${day}/${month}` }
}
