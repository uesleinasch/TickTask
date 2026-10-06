export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export interface TaskTimeFields {
  scheduled_date?: string | null
  scheduled_time?: string | null
  scheduled_end_time?: string | null
  due_date?: string | null
  due_time?: string | null
}

export interface NormalizedTaskTimes {
  scheduled_time: string | null
  scheduled_end_time: string | null
  due_time: string | null
}

const valid = (time: string | null | undefined): time is string => !!time && TIME_PATTERN.test(time)

export function normalizeTaskTimes(fields: TaskTimeFields): NormalizedTaskTimes {
  const start = fields.scheduled_date && valid(fields.scheduled_time) ? fields.scheduled_time : null
  const end =
    start && valid(fields.scheduled_end_time) && fields.scheduled_end_time > start
      ? fields.scheduled_end_time
      : null
  const due = fields.due_date && valid(fields.due_time) ? fields.due_time : null
  return { scheduled_time: start, scheduled_end_time: end, due_time: due }
}

export function taskTimeError(fields: TaskTimeFields): string | null {
  for (const key of ['scheduled_time', 'scheduled_end_time', 'due_time'] as const) {
    const value = fields[key]
    if (value != null && !TIME_PATTERN.test(value)) return `${key} deve estar no formato HH:MM`
  }
  if (fields.scheduled_time && !fields.scheduled_date) {
    return 'scheduled_time exige scheduled_date'
  }
  if (fields.scheduled_end_time && !fields.scheduled_time) {
    return 'scheduled_end_time exige scheduled_time'
  }
  if (
    fields.scheduled_time &&
    fields.scheduled_end_time &&
    fields.scheduled_end_time <= fields.scheduled_time
  ) {
    return 'scheduled_end_time deve ser depois de scheduled_time'
  }
  if (fields.due_time && !fields.due_date) return 'due_time exige due_date'
  return null
}

const TIME_KEYS = [
  'scheduled_date',
  'scheduled_time',
  'scheduled_end_time',
  'due_date',
  'due_time'
] as const

export function mergeTaskTimes(current: TaskTimeFields, patch: TaskTimeFields): TaskTimeFields {
  const merged: TaskTimeFields = {}
  for (const key of TIME_KEYS) merged[key] = patch[key] !== undefined ? patch[key] : current[key]
  if (patch.scheduled_date === null) {
    if (patch.scheduled_time === undefined) merged.scheduled_time = null
    if (patch.scheduled_end_time === undefined) merged.scheduled_end_time = null
  }
  if (patch.scheduled_time === null && patch.scheduled_end_time === undefined) {
    merged.scheduled_end_time = null
  }
  if (patch.due_date === null && patch.due_time === undefined) merged.due_time = null
  return merged
}

export function addMinutes(
  date: string,
  time: string,
  minutes: number
): { date: string; time: string } {
  const moment = new Date(`${date}T${time}:00Z`)
  moment.setUTCMinutes(moment.getUTCMinutes() + minutes)
  const iso = moment.toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return ''
  return end ? `${start}–${end}` : start
}
