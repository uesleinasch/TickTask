import type { TaskStatus } from '@shared/types'

export interface GcalTaskInput {
  id: number
  name: string
  description?: string | null
  status: TaskStatus
  project_name?: string | null
  scheduled_date?: string | null
  due_date?: string | null
  gcal_sync: boolean
}

export interface GcalBlockInput {
  id: number
  date: string
  start_time: string
  end_time: string
}

export type EventTime = { date: string } | { dateTime: string; timeZone: string }

export interface DesiredEvent {
  id: string
  summary: string
  description: string
  start: EventTime
  end: EventTime
}

export interface ExistingEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
}

export type GcalOp =
  | { kind: 'insert'; event: DesiredEvent }
  | { kind: 'update'; event: DesiredEvent }
  | { kind: 'delete'; id: string }

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function allDay(date: string): Pick<DesiredEvent, 'start' | 'end'> {
  return { start: { date }, end: { date: nextDay(date) } }
}

function describeTask(task: GcalTaskInput): string {
  const footer = task.project_name
    ? `TickTask #${task.id} · ${task.project_name}`
    : `TickTask #${task.id}`
  const text = task.description?.trim()
  return text ? `${text}\n\n${footer}` : footer
}

export function buildDesiredEvents(
  task: GcalTaskInput | null,
  blocks: GcalBlockInput[],
  timeZone: string
): DesiredEvent[] {
  if (!task || !task.gcal_sync) return []

  const prefix = task.status === 'finalizada' ? '✓ ' : ''
  const description = describeTask(task)
  const events: DesiredEvent[] = []

  for (const block of blocks) {
    if (block.end_time <= block.start_time) continue
    events.push({
      id: `tick${task.id}b${block.id}`,
      summary: `${prefix}${task.name}`,
      description,
      start: { dateTime: `${block.date}T${block.start_time}:00`, timeZone },
      end: { dateTime: `${block.date}T${block.end_time}:00`, timeZone }
    })
  }

  if (task.scheduled_date && DATE_PREFIX.test(task.scheduled_date)) {
    events.push({
      id: `tick${task.id}s`,
      summary: `${prefix}${task.name}`,
      description,
      ...allDay(task.scheduled_date.slice(0, 10))
    })
  }

  if (task.due_date && DATE_PREFIX.test(task.due_date)) {
    events.push({
      id: `tick${task.id}d`,
      summary: `${prefix}Prazo: ${task.name}`,
      description,
      ...allDay(task.due_date.slice(0, 10))
    })
  }

  return events
}

// O Google devolve dateTime com offset ("…T09:00:00-03:00"); a lista é pedida no mesmo fuso dos
// eventos, então a hora de parede (19 primeiros caracteres) basta para comparar.
function sameTime(desired: EventTime, existing: ExistingEvent['start']): boolean {
  if ('date' in desired) return existing?.date === desired.date && !existing.dateTime
  return existing?.dateTime?.slice(0, 19) === desired.dateTime
}

function isUpToDate(desired: DesiredEvent, existing: ExistingEvent): boolean {
  return (
    existing.status !== 'cancelled' &&
    existing.summary === desired.summary &&
    (existing.description ?? '') === desired.description &&
    sameTime(desired.start, existing.start) &&
    sameTime(desired.end, existing.end)
  )
}

export function planOps(desired: DesiredEvent[], existing: ExistingEvent[]): GcalOp[] {
  const existingById = new Map(existing.map((event) => [event.id, event]))
  const desiredIds = new Set(desired.map((event) => event.id))
  const ops: GcalOp[] = []

  for (const event of desired) {
    const current = existingById.get(event.id)
    if (!current) ops.push({ kind: 'insert', event })
    else if (!isUpToDate(event, current)) ops.push({ kind: 'update', event })
  }

  for (const event of existing) {
    if (event.status !== 'cancelled' && !desiredIds.has(event.id)) {
      ops.push({ kind: 'delete', id: event.id })
    }
  }

  return ops
}
