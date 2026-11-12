import type { FetchFn } from './googleOAuth'

export type JiraStatusCategory = 'new' | 'indeterminate' | 'done'

export interface JiraBoard {
  id: number
  name: string
}

export interface JiraIssue {
  key: string
  summary: string
  statusName: string
  statusCategory: JiraStatusCategory
  dueDate: string | null
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
  getMyself: () => Promise<{ displayName: string }>
  listBoards: () => Promise<JiraBoard[]>
  listAssignedBoardIssues: (boardId: number) => Promise<JiraIssue[]>
  getIssueStatus: (issueKey: string) => Promise<Pick<JiraIssue, 'statusName' | 'statusCategory'>>
  listTransitions: (issueKey: string) => Promise<JiraTransition[]>
  doTransition: (issueKey: string, transitionId: string) => Promise<void>
}

const RETRY_DELAY_MS = 1000
const PAGE_SIZE = 100
const ISSUE_FIELDS = 'summary,status,duedate'
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
      const data = await request<{ displayName: string }>('GET', '/rest/api/3/myself')
      return { displayName: data.displayName }
    },

    async listBoards() {
      const boards: JiraBoard[] = []
      for (;;) {
        const page = await request<{
          values: { id: number; name: string }[]
          isLast: boolean
        }>('GET', `/rest/agile/1.0/board?startAt=${boards.length}&maxResults=${PAGE_SIZE}`)
        boards.push(...page.values.map((b) => ({ id: b.id, name: b.name })))
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

    async getIssueStatus(issueKey) {
      const data = await request<RawIssue>(
        'GET',
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=status`
      )
      const issue = toIssue(data)
      return { statusName: issue.statusName, statusCategory: issue.statusCategory }
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
    }
  }
}

interface RawIssue {
  key: string
  fields: {
    summary: string
    duedate: string | null
    status: { name: string; statusCategory: { key: string } }
  }
}

function toIssue(raw: RawIssue): JiraIssue {
  return {
    key: raw.key,
    summary: raw.fields.summary,
    statusName: raw.fields.status.name,
    statusCategory: raw.fields.status.statusCategory.key as JiraStatusCategory,
    dueDate: raw.fields.duedate
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
