import { describe, expect, it, vi } from 'vitest'
import { createJiraApi, JiraApiError, type JiraApi } from './jiraApi'

const noSleep = async (): Promise<void> => {}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

interface Call {
  url: string
  method: string
  body?: unknown
}

function setup(handler: (url: string, init: RequestInit) => Response | Error): {
  api: JiraApi
  calls: Call[]
  fetch: ReturnType<typeof vi.fn>
} {
  const calls: Call[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit = {}): Promise<Response> => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      body: init.body ? JSON.parse(String(init.body)) : undefined
    })
    const result = handler(url, init)
    if (result instanceof Error) throw result
    return result
  })
  const api = createJiraApi({
    site: 'jacto.atlassian.net',
    authorization: 'Basic abc',
    fetch,
    sleep: noSleep
  })
  return { api, calls, fetch }
}

interface RawIssueFixture {
  key: string
  fields: {
    summary: string
    duedate: null
    status: { name: string; statusCategory: { key: string } }
  }
}

const issue = (key: string, statusName: string, category: string): RawIssueFixture => ({
  key,
  fields: {
    summary: `Resumo ${key}`,
    duedate: null,
    status: { name: statusName, statusCategory: { key: category } }
  }
})

describe('createJiraApi', () => {
  it('envia Basic auth e base do site', async () => {
    const { api, calls } = setup(() => jsonResponse(200, { displayName: 'Ana' }))
    await expect(api.getMyself()).resolves.toEqual({ displayName: 'Ana' })
    expect(calls[0].url).toBe('https://jacto.atlassian.net/rest/api/3/myself')
  })

  it('pagina boards pelo que o servidor devolveu, mesmo abaixo do maxResults pedido', async () => {
    const { api, calls } = setup((url) =>
      url.includes('startAt=0&')
        ? jsonResponse(200, { values: [{ id: 1, name: 'A' }], isLast: false })
        : jsonResponse(200, { values: [{ id: 2, name: 'B' }], isLast: true })
    )
    await expect(api.listBoards()).resolves.toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ])
    expect(calls).toHaveLength(2)
    expect(calls[1].url).toContain('startAt=1&')
  })

  it('pagina issues até o total mesmo com páginas menores que o pedido', async () => {
    const { api, calls } = setup((url) =>
      url.includes('startAt=0&')
        ? jsonResponse(200, { total: 2, issues: [issue('ABC-1', 'A Fazer', 'new')] })
        : jsonResponse(200, { total: 2, issues: [issue('ABC-2', 'A Fazer', 'new')] })
    )
    const issues = await api.listAssignedBoardIssues(7)
    expect(issues.map((i) => i.key)).toEqual(['ABC-1', 'ABC-2'])
    expect(calls[1].url).toContain('startAt=1&')
  })

  it('corpo de erro que não é JSON vira JiraApiError com o status', async () => {
    const { api } = setup(() => new Response('<html>Bad gateway</html>', { status: 404 }))
    const error = await api.getMyself().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(JiraApiError)
    expect((error as JiraApiError).message).toBe('Jira respondeu 404.')
  })

  it('resposta 200 que não é JSON (ex.: página de login) vira erro claro', async () => {
    const { api } = setup(() => new Response('<html>login</html>', { status: 200 }))
    await expect(api.getMyself()).rejects.toThrow('Resposta inesperada do Jira')
  })

  it('lista issues do board atribuídas ao usuário', async () => {
    const { api, calls } = setup(() =>
      jsonResponse(200, { total: 1, issues: [issue('ABC-1', 'Em Progresso', 'indeterminate')] })
    )
    const issues = await api.listAssignedBoardIssues(7)
    expect(issues).toEqual([
      {
        key: 'ABC-1',
        summary: 'Resumo ABC-1',
        statusName: 'Em Progresso',
        statusCategory: 'indeterminate',
        dueDate: null
      }
    ])
    expect(decodeURIComponent(calls[0].url)).toContain(
      '/rest/agile/1.0/board/7/issue?jql=assignee = currentUser() AND (statusCategory != Done OR updated >= -30d)'
    )
  })

  it('tenta de novo uma vez em 429 e depois sucede', async () => {
    let attempt = 0
    const { api, fetch } = setup(() =>
      attempt++ === 0 ? jsonResponse(429) : jsonResponse(200, { displayName: 'Ana' })
    )
    await expect(api.getMyself()).resolves.toEqual({ displayName: 'Ana' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('erro 401 vira JiraApiError com mensagem amigável e não repete', async () => {
    const { api, fetch } = setup(() => jsonResponse(401, { errorMessages: ['nope'] }))
    const error = await api.getMyself().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(JiraApiError)
    expect((error as JiraApiError).status).toBe(401)
    expect((error as JiraApiError).message).toContain('Credenciais')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lista transições e executa a escolhida', async () => {
    const { api, calls } = setup((url, init) => {
      if (init.method === 'POST') return jsonResponse(204)
      return jsonResponse(200, {
        transitions: [{ id: '31', to: { name: 'Concluído', statusCategory: { key: 'done' } } }]
      })
    })
    await expect(api.listTransitions('ABC-1')).resolves.toEqual([
      { id: '31', toName: 'Concluído', toCategory: 'done' }
    ])
    await api.doTransition('ABC-1', '31')
    expect(calls[1]).toEqual({
      url: 'https://jacto.atlassian.net/rest/api/3/issue/ABC-1/transitions',
      method: 'POST',
      body: { transition: { id: '31' } }
    })
  })
})
