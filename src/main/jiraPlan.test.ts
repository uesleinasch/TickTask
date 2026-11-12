import { describe, expect, it } from 'vitest'
import {
  buildIssueUrl,
  mapJiraStatusToLocal,
  pickTransition,
  planImport,
  resolveJiraTarget,
  type ExistingJiraTask
} from './jiraPlan'
import type { JiraIssue } from './jiraApi'

const issue = (over: Partial<JiraIssue> = {}): JiraIssue => ({
  key: 'ABC-1',
  summary: 'Título',
  statusName: 'Em Progresso',
  statusCategory: 'indeterminate',
  dueDate: null,
  ...over
})

describe('mapJiraStatusToLocal', () => {
  it('usa a categoria Jira quando não há override', () => {
    expect(mapJiraStatusToLocal(issue({ statusCategory: 'new' }), {})).toBe('inbox')
    expect(mapJiraStatusToLocal(issue({ statusCategory: 'done' }), {})).toBe('finalizada')
  })

  it('override por nome de status vence a categoria', () => {
    const mapping = { Revisão: 'aguardando' as const }
    expect(
      mapJiraStatusToLocal(
        issue({ statusName: 'Revisão', statusCategory: 'indeterminate' }),
        mapping
      )
    ).toBe('aguardando')
  })
})

describe('resolveJiraTarget / pickTransition', () => {
  const transitions = [
    { id: '11', toName: 'Backlog', toCategory: 'new' as const },
    { id: '21', toName: 'Em Progresso', toCategory: 'indeterminate' as const },
    { id: '31', toName: 'Concluído', toCategory: 'done' as const }
  ]

  it('prefere o nome explicitamente mapeado', () => {
    const target = resolveJiraTarget('executando', { 'Em Progresso': 'executando' })
    expect(target).toEqual({ name: 'Em Progresso' })
    expect(pickTransition(transitions, target!)?.id).toBe('21')
  })

  it('cai na categoria padrão quando não há mapeamento explícito', () => {
    const target = resolveJiraTarget('finalizada', {})
    expect(target).toEqual({ category: 'done' })
    expect(pickTransition(transitions, target!)?.id).toBe('31')
  })

  it('status local sem equivalente não gera alvo (não empurra para o Jira)', () => {
    expect(resolveJiraTarget('someday', {})).toBeNull()
  })

  it('retorna undefined quando o workflow não tem transição para o alvo', () => {
    expect(pickTransition(transitions, { name: 'Testando' })).toBeUndefined()
  })
})

describe('planImport', () => {
  const site = 'jacto.atlassian.net'

  it('cria tasks novas e marca noop para as que já estão iguais', () => {
    const existing = new Map<string, ExistingJiraTask>([
      [
        'ABC-2',
        {
          id: 5,
          name: 'Igual',
          status: 'executando',
          due_date: null,
          external_url: buildIssueUrl(site, 'ABC-2')
        }
      ]
    ])
    const ops = planImport(
      [issue({ key: 'ABC-1' }), issue({ key: 'ABC-2', summary: 'Igual' })],
      existing,
      site,
      {}
    )
    expect(ops.map((o) => o.type)).toEqual(['create', 'noop'])
    expect(ops[0].url).toBe('https://jacto.atlassian.net/browse/ABC-1')
  })

  it('marca update quando status ou prazo mudou no Jira', () => {
    const existing = new Map<string, ExistingJiraTask>([
      [
        'ABC-1',
        {
          id: 9,
          name: 'Título',
          status: 'inbox',
          due_date: '2026-11-01T00:00:00',
          external_url: buildIssueUrl(site, 'ABC-1')
        }
      ]
    ])
    const [op] = planImport([issue({ dueDate: '2026-11-01' })], existing, site, {})
    expect(op.type).toBe('update')
    expect(op.existingId).toBe(9)
    expect(op.status).toBe('executando')
  })
})
