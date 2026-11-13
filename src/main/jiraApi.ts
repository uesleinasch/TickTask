import type { FetchFn } from './googleOAuth'
import type { DocNode } from './jiraAdf'
import type { RawIssueWithMeta } from './jiraFields'

export type JiraStatusCategory = 'new' | 'indeterminate' | 'done'

export interface JiraBoard {
  id: number
  name: string
  spaceKey: string | null
  spaceName: string | null
}

export interface JiraSprint {
  id: number
  name: string
  state: string
}

export interface JiraAccount {
  accountId: string
  displayName: string
}

export interface JiraIssue {
  key: string
  summary: string
  statusName: string
  statusCategory: JiraStatusCategory
  dueDate: string | null
  spaceKey: string | null
  spaceName: string | null
  issueType: JiraIssueType | null
  parentKey: string | null
  parentSummary: string | null
}

export interface JiraIssueType {
  name: string
  hierarchyLevel: number | null
  subtask: boolean
}

export interface JiraTransition {
  id: string
  toName: string
  toCategory: JiraStatusCategory
}

export class JiraApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'JiraApiError'
  }
}

export interface JiraApiDeps {
  site: string
  authorization: string
  fetch: FetchFn
  sleep?: (ms: number) => Promise<void>
}

export interface JiraApi {
  getMyself: () => Promise<JiraAccount>
  listBoards: () => Promise<JiraBoard[]>
  listAssignedBoardIssues: (boardId: number) => Promise<JiraIssue[]>
  getIssue: (issueKey: string) => Promise<JiraIssue>
  getIssueWithEditMeta: (issueKey: string) => Promise<RawIssueWithMeta>
  getDescriptions: (issueKeys: string[]) => Promise<Map<string, DocNode | null>>
  updateIssue: (issueKey: string, fields: Record<string, unknown>) => Promise<void>
  listTransitions: (issueKey: string) => Promise<JiraTransition[]>
  doTransition: (issueKey: string, transitionId: string) => Promise<void>
  listOpenSprints: (boardId: number) => Promise<JiraSprint[]>
  searchUsers: (query: string, assignableTo?: string) => Promise<JiraAccount[]>
}

const RETRY_DELAY_MS = 1000
const PAGE_SIZE = 100
const ISSUE_FIELDS = 'summary,status,duedate,project,issuetype,parent'
const SEARCH_BATCH = 100
const ASSIGNED_ISSUES_JQL =
  'assignee = currentUser() AND (statusCategory != Done OR updated >= -30d)'

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function createJiraApi(deps: JiraApiDeps): JiraApi {
  const sleep = deps.sleep ?? defaultSleep
  const baseUrl = `https://${deps.site}`

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let retried = false
    for (;;) {
      let response: Response
      try {
        response = await deps.fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            Authorization: deps.authorization,
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
          },
          body: body === undefined ? undefined : JSON.stringify(body)
        })
      } catch (error) {
        if (retried) throw error
        retried = true
        await sleep(RETRY_DELAY_MS)
        continue
      }

      if ((response.status === 429 || response.status >= 500) && !retried) {
        retried = true
        await sleep(RETRY_DELAY_MS)
        continue
      }

      const text = await response.text()
      const data = parseJson(text)
      if (!response.ok) {
        throw new JiraApiError(response.status, describeError(response.status, data))
      }
      if (text && data === undefined) {
        throw new JiraApiError(response.status, 'Resposta inesperada do Jira. Confira o site.')
      }
      return data as T
    }
  }

  return {
    async getMyself() {
      const data = await request<JiraAccount>('GET', '/rest/api/3/myself')
      return { accountId: data.accountId, displayName: data.displayName }
    },

    async listBoards() {
      const boards: JiraBoard[] = []
      for (;;) {
        const page = await request<{
          values: {
            id: number
            name: string
            location?: { projectKey?: string; projectName?: string; displayName?: string }
          }[]
          isLast: boolean
        }>('GET', `/rest/agile/1.0/board?startAt=${boards.length}&maxResults=${PAGE_SIZE}`)
        boards.push(
          ...page.values.map((b) => ({
            id: b.id,
            name: b.name,
            spaceKey: b.location?.projectKey ?? null,
            spaceName: b.location?.projectName ?? b.location?.displayName ?? null
          }))
        )
        if (page.isLast || page.values.length === 0) return boards
      }
    },

    async listAssignedBoardIssues(boardId) {
      const jql = encodeURIComponent(ASSIGNED_ISSUES_JQL)
      const issues: JiraIssue[] = []
      for (;;) {
        const page = await request<{ total: number; issues: RawIssue[] }>(
          'GET',
          `/rest/agile/1.0/board/${boardId}/issue?jql=${jql}&fields=${ISSUE_FIELDS}&startAt=${issues.length}&maxResults=${PAGE_SIZE}`
        )
        issues.push(...page.issues.map(toIssue))
        if (page.issues.length === 0 || issues.length >= page.total) return issues
      }
    },

    async getIssue(issueKey) {
      const data = await request<RawIssue>(
        'GET',
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${ISSUE_FIELDS}`
      )
      return toIssue(data)
    },

    async getIssueWithEditMeta(issueKey) {
      return request<RawIssueWithMeta>(
        'GET',
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}?expand=editmeta`
      )
    },

    async getDescriptions(issueKeys) {
      const descriptions = new Map<string, DocNode | null>()
      for (let i = 0; i < issueKeys.length; i += SEARCH_BATCH) {
        const batch = issueKeys.slice(i, i + SEARCH_BATCH)
        const jql = `key in (${batch.map((k) => `"${k.replace(/"/g, '')}"`).join(',')})`
        let nextPageToken: string | undefined
        do {
          const page = await request<{
            issues: { key: string; fields: { description?: DocNode | null } }[]
            nextPageToken?: string
          }>('POST', '/rest/api/3/search/jql', {
            jql,
            fields: ['description'],
            maxResults: SEARCH_BATCH,
            ...(nextPageToken ? { nextPageToken } : {})
          })
          for (const issue of page.issues) {
            descriptions.set(issue.key, issue.fields.description ?? null)
          }
          nextPageToken = page.nextPageToken
        } while (nextPageToken)
      }
      return descriptions
    },

    async updateIssue(issueKey, fields) {
      await request<void>('PUT', `/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { fields })
    },

    async listTransitions(issueKey) {
      const data = await request<{
        transitions: { id: string; to: { name: string; statusCategory: { key: string } } }[]
      }>('GET', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`)
      return data.transitions.map((t) => ({
        id: t.id,
        toName: t.to.name,
        toCategory: t.to.statusCategory.key as JiraStatusCategory
      }))
    },

    async doTransition(issueKey, transitionId) {
      await request<void>('POST', `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
        transition: { id: transitionId }
      })
    },

    async listOpenSprints(boardId) {
      const sprints: JiraSprint[] = []
      for (;;) {
        const page = await request<{ values: JiraSprint[]; isLast: boolean }>(
          'GET',
          `/rest/agile/1.0/board/${boardId}/sprint?state=active,future&startAt=${sprints.length}&maxResults=${PAGE_SIZE}`
        )
        sprints.push(...page.values.map((s) => ({ id: s.id, name: s.name, state: s.state })))
        if (page.isLast || page.values.length === 0) return sprints
      }
    },

    async searchUsers(query, assignableTo) {
      const q = encodeURIComponent(query)
      const path = assignableTo
        ? `/rest/api/3/user/assignable/search?issueKey=${encodeURIComponent(assignableTo)}&query=${q}&maxResults=20`
        : `/rest/api/3/user/search?query=${q}&maxResults=20`
      const users = await request<(JiraAccount & { accountType?: string })[]>('GET', path)
      return users
        .filter((u) => !u.accountType || u.accountType === 'atlassian')
        .map((u) => ({ accountId: u.accountId, displayName: u.displayName }))
    }
  }
}

interface RawIssue {
  key: string
  fields: {
    summary: string
    duedate: string | null
    status: { name: string; statusCategory: { key: string } }
    project?: { key: string; name: string }
    issuetype?: { name: string; hierarchyLevel?: number; subtask?: boolean }
    parent?: { key: string; fields?: { summary?: string } }
  }
}

function toIssue(raw: RawIssue): JiraIssue {
  const type = raw.fields.issuetype
  return {
    key: raw.key,
    summary: raw.fields.summary,
    statusName: raw.fields.status.name,
    statusCategory: raw.fields.status.statusCategory.key as JiraStatusCategory,
    dueDate: raw.fields.duedate,
    spaceKey: raw.fields.project?.key ?? null,
    spaceName: raw.fields.project?.name ?? null,
    issueType: type
      ? { name: type.name, hierarchyLevel: type.hierarchyLevel ?? null, subtask: !!type.subtask }
      : null,
    parentKey: raw.fields.parent?.key ?? null,
    parentSummary: raw.fields.parent?.fields?.summary ?? null
  }
}

function parseJson(text: string): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function describeError(status: number, data: unknown): string {
  const body = data as { errorMessages?: string[]; message?: string } | undefined
  const detail = body?.errorMessages?.join(' ') || body?.message
  if (status === 401) return 'Credenciais do Jira inválidas (e-mail ou API token).'
  if (status === 403) return 'Sem permissão no Jira para essa operação.'
  return detail ? `Jira respondeu ${status}: ${detail}` : `Jira respondeu ${status}.`
}
