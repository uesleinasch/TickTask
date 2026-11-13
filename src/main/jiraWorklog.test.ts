import { describe, expect, it } from 'vitest'
import {
  formatJiraDateTime,
  pendingWorklogEntries,
  worklogFor,
  type WorklogCandidate
} from './jiraWorklog'

const entry = (over: Partial<WorklogCandidate> = {}): WorklogCandidate => ({
  id: 1,
  start_time: '2026-11-13T10:00:00.000Z',
  end_time: '2026-11-13T10:30:00.000Z',
  duration_seconds: 1800,
  jira_worklog_id: null,
  ...over
})

describe('pendingWorklogEntries', () => {
  it('não envia nada com a sincronização desligada', () => {
    expect(pendingWorklogEntries([entry()], null)).toEqual([])
  })

  it('envia só sessões encerradas, sem worklog, com 1 min ou mais e depois de ligar', () => {
    const since = '2026-11-13T09:00:00.000Z'
    const entries = [
      entry({ id: 1 }),
      entry({ id: 2, end_time: null, duration_seconds: null }),
      entry({ id: 3, jira_worklog_id: '77' }),
      entry({ id: 4, duration_seconds: 59 }),
      entry({ id: 5, end_time: '2026-11-13T08:00:00.000Z' })
    ]
    expect(pendingWorklogEntries(entries, since).map((e) => e.id)).toEqual([1])
  })
})

describe('worklogFor', () => {
  it('usa o início da sessão e arredonda para minutos', () => {
    const log = worklogFor(entry({ duration_seconds: 1789 }))
    expect(log.timeSpentSeconds).toBe(1800)
    expect(log.started).toBe(formatJiraDateTime(new Date('2026-11-13T10:00:00.000Z')))
  })

  it('tempo manual (início = fim) começa antes do fim pela duração', () => {
    const log = worklogFor(
      entry({
        start_time: '2026-11-13T12:00:00.000Z',
        end_time: '2026-11-13T12:00:00.000Z',
        duration_seconds: 600
      })
    )
    expect(log.started).toBe(formatJiraDateTime(new Date('2026-11-13T11:50:00.000Z')))
    expect(log.timeSpentSeconds).toBe(600)
  })
})

describe('formatJiraDateTime', () => {
  it('segue o formato aceito pelo Jira, com fuso numérico', () => {
    expect(formatJiraDateTime(new Date())).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/
    )
  })
})
