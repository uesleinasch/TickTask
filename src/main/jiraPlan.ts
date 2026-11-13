import type { JiraIssueKind, TaskStatus } from '@shared/types'
import type { JiraIssue, JiraIssueType, JiraStatusCategory } from './jiraApi'
import { adfToProsemirror, isEmptyDoc, parseDoc, type DocNode } from './jiraAdf'

export type StatusMapping = Record<string, TaskStatus>
export type SpaceProjects = Record<string, number>

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

export function buildIssueUrl(site: string, key: string): string {
  return `https://${site}/browse/${encodeURIComponent(key)}`
}

export function classifyIssueType(type: JiraIssueType | null): JiraIssueKind | null {
  if (!type) return null
  if (type.subtask || (type.hierarchyLevel !== null && type.hierarchyLevel < 0)) return 'subtask'
  if (type.hierarchyLevel !== null && type.hierarchyLevel > 0) return 'epic'
  const name = type.name.toLowerCase()
  if (/epic|épico/.test(name)) return 'epic'
  if (/sub-?task|subtarefa/.test(name)) return 'subtask'
  if (/story|hist[oó]ria/.test(name)) return 'story'
  if (/bug|defeito/.test(name)) return 'bug'
  return 'task'
}

export interface JiraHierarchyFields {
  jira_issue_type: string | null
  jira_issue_kind: JiraIssueKind | null
  jira_parent_key: string | null
  jira_parent_summary: string | null
}

export interface ExistingJiraTask extends JiraHierarchyFields {
  id: number
  name: string
  due_date: string | null
  external_url: string | null
  jira_status: string | null
  jira_space: string | null
  project_id: number | null
}

export interface JiraTaskFields extends JiraHierarchyFields {
  name: string
  due_date: string | null
  external_url: string
  jira_status: string
  jira_space: string | null
  project_id: number | null
}

function hierarchyOf(issue: JiraIssue): JiraHierarchyFields {
  return {
    jira_issue_type: issue.issueType?.name ?? null,
    jira_issue_kind: classifyIssueType(issue.issueType),
    jira_parent_key: issue.parentKey,
    jira_parent_summary: issue.parentSummary
  }
}

export type ImportOp =
  | { type: 'create'; key: string; fields: JiraTaskFields & { status: TaskStatus } }
  | { type: 'update'; key: string; id: number; patch: Partial<JiraTaskFields> }
  | { type: 'noop'; key: string; id: number }

export function planImport(
  issues: JiraIssue[],
  existingByKey: Map<string, ExistingJiraTask>,
  site: string,
  mapping: StatusMapping,
  spaceProjects: SpaceProjects = {}
): ImportOp[] {
  const ops: ImportOp[] = []
  for (const issue of issues) {
    const url = buildIssueUrl(site, issue.key)
    const spaceProject = issue.spaceKey ? (spaceProjects[issue.spaceKey] ?? null) : null
    const existing = existingByKey.get(issue.key)
    const hierarchy = hierarchyOf(issue)

    if (!existing) {
      if (issue.statusCategory === 'done') continue
      ops.push({
        type: 'create',
        key: issue.key,
        fields: {
          name: issue.summary,
          status: mapJiraStatusToLocal(issue, mapping),
          due_date: issue.dueDate,
          external_url: url,
          jira_status: issue.statusName,
          jira_space: issue.spaceName,
          project_id: spaceProject,
          ...hierarchy
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
    if (existing.jira_status !== issue.statusName) patch.jira_status = issue.statusName
    if (issue.spaceName && existing.jira_space !== issue.spaceName) {
      patch.jira_space = issue.spaceName
    }
    if (existing.project_id === null && spaceProject !== null) patch.project_id = spaceProject
    for (const field of Object.keys(hierarchy) as (keyof JiraHierarchyFields)[]) {
      if (existing[field] !== hierarchy[field]) Object.assign(patch, { [field]: hierarchy[field] })
    }

    ops.push(
      Object.keys(patch).length > 0
        ? { type: 'update', key: issue.key, id: existing.id, patch }
        : { type: 'noop', key: issue.key, id: existing.id }
    )
  }
  return ops
}

export interface DescriptionSyncState {
  notes: string | null
  jira_desc_hash: string | null
}

export type DescriptionImport =
  | { type: 'none' }
  | { type: 'replace'; notes: string | null }
  | { type: 'merge'; notes: string }
  | { type: 'push' }

export function planDescriptionImport(
  description: DocNode | null,
  descriptionHash: string,
  state: DescriptionSyncState
): DescriptionImport {
  if (state.jira_desc_hash === descriptionHash) return { type: 'none' }

  const fromJira = isEmptyDoc(description) ? null : adfToProsemirror(description)
  const local = parseDoc(state.notes)
  const firstSync = state.jira_desc_hash === null
  if (!firstSync || isEmptyDoc(local)) {
    return { type: 'replace', notes: fromJira ? JSON.stringify(fromJira) : null }
  }
  if (!fromJira) return { type: 'push' }
  const merged: DocNode = {
    type: 'doc',
    content: [...(fromJira.content ?? []), { type: 'horizontalRule' }, ...(local?.content ?? [])]
  }
  return { type: 'merge', notes: JSON.stringify(merged) }
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
