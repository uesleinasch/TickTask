import type { TaskStatus } from '@shared/types'
import type { JiraIssue, JiraStatusCategory, JiraTransition } from './jiraApi'

export type StatusMapping = Record<string, TaskStatus>

export const DEFAULT_STATUS_BY_CATEGORY: Record<JiraStatusCategory, TaskStatus> = {
  new: 'inbox',
  indeterminate: 'executando',
  done: 'finalizada'
}

const DEFAULT_CATEGORY_BY_STATUS: Partial<Record<TaskStatus, JiraStatusCategory>> = {
  inbox: 'new',
  executando: 'indeterminate',
  finalizada: 'done'
}

export function mapJiraStatusToLocal(
  issue: Pick<JiraIssue, 'statusName' | 'statusCategory'>,
  mapping: StatusMapping
): TaskStatus {
  return mapping[issue.statusName] ?? DEFAULT_STATUS_BY_CATEGORY[issue.statusCategory]
}

export interface JiraTarget {
  name?: string
  category?: JiraStatusCategory
}

export function resolveJiraTarget(local: TaskStatus, mapping: StatusMapping): JiraTarget | null {
  const explicit = Object.keys(mapping).find((name) => mapping[name] === local)
  if (explicit) return { name: explicit }
  const category = DEFAULT_CATEGORY_BY_STATUS[local]
  return category ? { category } : null
}

export function pickTransition(
  transitions: JiraTransition[],
  target: JiraTarget
): JiraTransition | undefined {
  if (target.name) {
    const byName = transitions.find((t) => t.toName === target.name)
    if (byName) return byName
  }
  if (target.category) {
    return transitions.find((t) => t.toCategory === target.category)
  }
  return undefined
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
}

export interface ImportOp {
  type: 'create' | 'update' | 'noop'
  issue: JiraIssue
  status: TaskStatus
  url: string
  existingId?: number
}

export function planImport(
  issues: JiraIssue[],
  existingByKey: Map<string, ExistingJiraTask>,
  site: string,
  mapping: StatusMapping
): ImportOp[] {
  return issues.map((issue) => {
    const status = mapJiraStatusToLocal(issue, mapping)
    const url = buildIssueUrl(site, issue.key)
    const existing = existingByKey.get(issue.key)
    if (!existing) return { type: 'create', issue, status, url }

    const changed =
      existing.name !== issue.summary ||
      existing.status !== status ||
      (existing.due_date?.slice(0, 10) ?? null) !== issue.dueDate ||
      existing.external_url !== url
    return {
      type: changed ? 'update' : 'noop',
      issue,
      status,
      url,
      existingId: existing.id
    }
  })
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
