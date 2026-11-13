export const MIN_WORKLOG_SECONDS = 60

export interface WorklogCandidate {
  id: number
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  jira_worklog_id: string | null
}

export function pendingWorklogEntries(
  entries: WorklogCandidate[],
  since: string | null
): WorklogCandidate[] {
  if (!since) return []
  const sinceMs = Date.parse(since)
  return entries.filter(
    (entry) =>
      entry.end_time !== null &&
      entry.jira_worklog_id === null &&
      (entry.duration_seconds ?? 0) >= MIN_WORKLOG_SECONDS &&
      Date.parse(entry.end_time) >= sinceMs
  )
}

const pad = (value: number, size = 2): string => String(Math.abs(value)).padStart(size, '0')

export function formatJiraDateTime(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}${sign}${pad(Math.trunc(offset / 60))}${pad(offset % 60)}`
  )
}

export function worklogFor(entry: WorklogCandidate): {
  started: string
  timeSpentSeconds: number
} {
  const seconds = entry.duration_seconds ?? 0
  const end = entry.end_time ? Date.parse(entry.end_time) : Date.parse(entry.start_time)
  const startMs = Math.min(Date.parse(entry.start_time), end - seconds * 1000)
  return {
    started: formatJiraDateTime(new Date(startMs)),
    timeSpentSeconds: Math.round(seconds / 60) * 60
  }
}
