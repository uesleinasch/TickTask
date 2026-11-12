import type { TaskStatus } from '@shared/types'
import type { JiraIssue, JiraStatusCategory, JiraTransition } from './jiraApi'

export type StatusMapping = Record<string, TaskStatus>

export const DEFAULT_STATUS_BY_CATEGORY: Record<JiraStatusCategory, TaskStatus> = {
  new: 'inbox',
  indeterminate: 'executando',
  done: 'finalizada'
}

export function mapJiraStatusToLocal(
  issue: Pick<JiraIssue, 'statusName' | 'statusCategory'>,
  mapping: StatusMapping
): TaskStatus {
  return mapping[issue.statusName] ?? DEFAULT_STATUS_BY_CATEGORY[issue.statusCategory]
}

export function hasJiraEquivalent(local: TaskStatus, mapping: StatusMapping): boolean {
  return (
    Object.values(mapping).includes(local) ||
    Object.values(DEFAULT_STATUS_BY_CATEGORY).includes(local)
  )
}

export function pickTransitionFor(
  local: TaskStatus,
  transitions: JiraTransition[],
  mapping: StatusMapping
): JiraTransition | undefined {
  const reaching = transitions.filter(
    (t) =>
      mapJiraStatusToLocal({ statusName: t.toName, statusCategory: t.toCategory }, mapping) ===
      local
  )
  return reaching.find((t) => mapping[t.toName] === local) ?? reaching[0]
}

export function buildIssueUrl(site: string, key: string): string {
  return `https://${site}/browse/${encodeURIComponent(key)}`
}

export interface ExistingJiraTask {
  id: number
  name: string
  status: TaskStatus
  due_date: string | null
  external_url: string | null
  jira_status: string | null
}

export interface JiraTaskFields {
  name: string
  status: TaskStatus
  due_date: string | null
  external_url: string
  jira_status: string
}

export type ImportOp =
  | { type: 'create'; key: string; fields: JiraTaskFields }
  | { type: 'update'; id: number; patch: Partial<JiraTaskFields> }
  | { type: 'noop'; id: number }

export function planImport(
  issues: JiraIssue[],
  existingByKey: Map<string, ExistingJiraTask>,
  site: string,
  mapping: StatusMapping
): ImportOp[] {
  const ops: ImportOp[] = []
  for (const issue of issues) {
    const status = mapJiraStatusToLocal(issue, mapping)
    const url = buildIssueUrl(site, issue.key)
    const existing = existingByKey.get(issue.key)

    if (!existing) {
      if (issue.statusCategory === 'done') continue
      ops.push({
        type: 'create',
        key: issue.key,
        fields: {
          name: issue.summary,
          status,
          due_date: issue.dueDate,
          external_url: url,
          jira_status: issue.statusName
        }
      })
      continue
    }

    const patch: Partial<JiraTaskFields> = {}
    if (existing.name !== issue.summary) patch.name = issue.summary
    if (existing.external_url !== url) patch.external_url = url
    if (issue.dueDate && existing.due_date?.slice(0, 10) !== issue.dueDate) {
      patch.due_date = issue.dueDate
    }
    if (existing.jira_status !== issue.statusName) {
      patch.jira_status = issue.statusName
      if (existing.status !== status) patch.status = status
    }

    ops.push(
      Object.keys(patch).length > 0
        ? { type: 'update', id: existing.id, patch }
        : { type: 'noop', id: existing.id }
    )
  }
  return ops
}

const JIRA_CLOUD_HOST = /^[a-z0-9-]+\.atlassian\.net$/

export function normalizeJiraSite(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  return JIRA_CLOUD_HOST.test(host) ? host : null
}
