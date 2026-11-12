import { describe, expect, it } from 'vitest'
import {
  buildIssueUrl,
  hasJiraEquivalent,
  mapJiraStatusToLocal,
  normalizeJiraSite,
  pickTransitionFor,
  planImport,
  type ExistingJiraTask
} from './jiraPlan'
import type { JiraIssue } from './jiraApi'

const SITE = 'jacto.atlassian.net'

const issue = (over: Partial<JiraIssue> = {}): JiraIssue => ({
  key: 'ABC-1',
  summary: 'Título',
  statusName: 'Em Progresso',
  statusCategory: 'indeterminate',
  dueDate: null,
  ...over
})

const existing = (over: Partial<ExistingJiraTask> = {}): ExistingJiraTask => ({
  id: 9,
  name: 'Título',
  status: 'executando',
  due_date: null,
  external_url: buildIssueUrl(SITE, 'ABC-1'),
  jira_status: 'Em Progresso',
  ...over
})

const linked = (task: ExistingJiraTask, key = 'ABC-1'): Map<string, ExistingJiraTask> =>
  new Map([[key, task]])

describe('mapJiraStatusToLocal', () => {
  it('usa a categoria Jira quando não há override', () => {
    expect(mapJiraStatusToLocal(issue({ statusCategory: 'new' }), {})).toBe('inbox')
    expect(mapJiraStatusToLocal(issue({ statusCategory: 'done' }), {})).toBe('finalizada')
  })

  it('override por nome de status vence a categoria', () => {
    expect(mapJiraStatusToLocal(issue({ statusName: 'Revisão' }), { Revisão: 'aguardando' })).toBe(
      'aguardando'
    )
  })
})

describe('hasJiraEquivalent', () => {
  it('reconhece status cobertos por categoria ou por mapeamento explícito', () => {
    expect(hasJiraEquivalent('finalizada', {})).toBe(true)
    expect(hasJiraEquivalent('aguardando', { Revisão: 'aguardando' })).toBe(true)
  })

  it('status local sem equivalente não é empurrado ao Jira', () => {
    expect(hasJiraEquivalent('someday', {})).toBe(false)
    expect(hasJiraEquivalent('proximas', {})).toBe(false)
  })
})

describe('pickTransitionFor', () => {
  const transitions = [
    { id: '11', toName: 'Backlog', toCategory: 'new' as const },
    { id: '21', toName: 'Em Progresso', toCategory: 'indeterminate' as const },
    { id: '31', toName: 'Cancelado', toCategory: 'done' as const },
    { id: '41', toName: 'Concluído', toCategory: 'done' as const }
  ]

  it('cai na categoria padrão quando não há mapeamento explícito', () => {
    expect(pickTransitionFor('executando', transitions, {})?.id).toBe('21')
  })

  it('ignora transição da categoria cujo destino está mapeado para outro status local', () => {
    expect(pickTransitionFor('finalizada', transitions, { Cancelado: 'someday' })?.id).toBe('41')
  })

  it('prefere o destino mapeado explicitamente para o status local', () => {
    expect(pickTransitionFor('finalizada', transitions, { Concluído: 'finalizada' })?.id).toBe('41')
  })

  it('devolve undefined quando nenhuma transição leva a um status equivalente', () => {
    expect(pickTransitionFor('aguardando', transitions, {})).toBeUndefined()
  })
})

describe('planImport', () => {
  it('cria tasks novas com link, status mapeado e snapshot do status Jira', () => {
    const [op] = planImport([issue({ dueDate: '2026-11-20' })], new Map(), SITE, {})
    expect(op).toEqual({
      type: 'create',
      key: 'ABC-1',
      fields: {
        name: 'Título',
        status: 'executando',
        due_date: '2026-11-20',
        external_url: 'https://jacto.atlassian.net/browse/ABC-1',
        jira_status: 'Em Progresso'
      }
    })
  })

  it('não cria task para issue já concluída', () => {
    expect(planImport([issue({ statusCategory: 'done' })], new Map(), SITE, {})).toEqual([])
  })

  it('atualiza task existente para concluída quando a issue fecha no Jira', () => {
    const [op] = planImport(
      [issue({ statusName: 'Concluído', statusCategory: 'done' })],
      linked(existing()),
      SITE,
      {}
    )
    expect(op).toEqual({
      type: 'update',
      id: 9,
      patch: { jira_status: 'Concluído', status: 'finalizada' }
    })
  })

  it('preserva o status local quando o status no Jira não mudou desde a última leitura', () => {
    const [op] = planImport([issue()], linked(existing({ status: 'proximas' })), SITE, {})
    expect(op).toEqual({ type: 'noop', id: 9 })
  })

  it('task vinculada sem snapshot recebe o status do Jira', () => {
    const [op] = planImport(
      [issue()],
      linked(existing({ status: 'inbox', jira_status: null })),
      SITE,
      {}
    )
    expect(op).toEqual({
      type: 'update',
      id: 9,
      patch: { jira_status: 'Em Progresso', status: 'executando' }
    })
  })

  it('não apaga prazo local quando a issue não tem prazo, e atualiza quando tem', () => {
    const local = existing({ due_date: '2026-11-01T00:00:00' })
    expect(planImport([issue({ dueDate: null })], linked(local), SITE, {})[0].type).toBe('noop')
    expect(planImport([issue({ dueDate: '2026-11-01' })], linked(local), SITE, {})[0].type).toBe(
      'noop'
    )
    expect(planImport([issue({ dueDate: '2026-12-01' })], linked(local), SITE, {})[0]).toEqual({
      type: 'update',
      id: 9,
      patch: { due_date: '2026-12-01' }
    })
  })

  it('atualiza o título quando ele muda no Jira', () => {
    expect(planImport([issue({ summary: 'Novo' })], linked(existing()), SITE, {})[0]).toEqual({
      type: 'update',
      id: 9,
      patch: { name: 'Novo' }
    })
  })
})

describe('normalizeJiraSite', () => {
  it('aceita host puro ou URL colada', () => {
    expect(normalizeJiraSite('jacto.atlassian.net')).toBe('jacto.atlassian.net')
    expect(normalizeJiraSite(' https://Jacto.atlassian.net/jira/board ')).toBe(
      'jacto.atlassian.net'
    )
  })

  it('recusa hosts que não são Jira Cloud', () => {
    expect(normalizeJiraSite('exemplo.com')).toBeNull()
    expect(normalizeJiraSite('')).toBeNull()
  })
})
