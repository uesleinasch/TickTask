import { describe, expect, it } from 'vitest'
import {
  buildIssueUrl,
  classifyIssueType,
  mapJiraStatusToLocal,
  normalizeJiraSite,
  planDescriptionImport,
  planImport,
  type ExistingJiraTask
} from './jiraPlan'
import type { JiraIssue, JiraIssueType } from './jiraApi'
import type { DocNode } from './jiraAdf'

const SITE = 'jacto.atlassian.net'

const issue = (over: Partial<JiraIssue> = {}): JiraIssue => ({
  key: 'ABC-1',
  summary: 'Título',
  statusName: 'Em Progresso',
  statusCategory: 'indeterminate',
  dueDate: null,
  spaceKey: 'CON',
  spaceName: 'Conecta',
  issueType: null,
  parentKey: null,
  parentSummary: null,
  ...over
})

const existing = (over: Partial<ExistingJiraTask> = {}): ExistingJiraTask => ({
  id: 9,
  name: 'Título',
  due_date: null,
  external_url: buildIssueUrl(SITE, 'ABC-1'),
  jira_status: 'Em Progresso',
  jira_space: 'Conecta',
  project_id: 5,
  jira_issue_type: null,
  jira_issue_kind: null,
  jira_parent_key: null,
  jira_parent_summary: null,
  ...over
})

describe('classifyIssueType', () => {
  const type = (
    name: string,
    hierarchyLevel: number | null = 0,
    subtask = false
  ): JiraIssueType => ({
    name,
    hierarchyLevel,
    subtask
  })

  it('usa o nível da hierarquia quando existe', () => {
    expect(classifyIssueType(type('Iniciativa', 1))).toBe('epic')
    expect(classifyIssueType(type('Qualquer', -1))).toBe('subtask')
    expect(classifyIssueType(type('Item', 0, true))).toBe('subtask')
  })

  it('separa história, bug e tarefa pelo nome no mesmo nível', () => {
    expect(classifyIssueType(type('História'))).toBe('story')
    expect(classifyIssueType(type('Story'))).toBe('story')
    expect(classifyIssueType(type('Bug'))).toBe('bug')
    expect(classifyIssueType(type('Tarefa'))).toBe('task')
  })

  it('cai no nome quando não há nível', () => {
    expect(classifyIssueType(type('Épico', null))).toBe('epic')
    expect(classifyIssueType(type('Sub-task', null))).toBe('subtask')
    expect(classifyIssueType(null)).toBeNull()
  })
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
        jira_status: 'Em Progresso',
        jira_space: 'Conecta',
        project_id: null,
        jira_issue_type: null,
        jira_issue_kind: null,
        jira_parent_key: null,
        jira_parent_summary: null
      }
    })
  })

  it('guarda tipo e issue pai e atualiza quando mudam no Jira', () => {
    const story = issue({
      issueType: { name: 'História', hierarchyLevel: 0, subtask: false },
      parentKey: 'ABC-100',
      parentSummary: 'Épico de login'
    })
    const [created] = planImport([story], new Map(), SITE, {})
    expect(created.type === 'create' && created.fields).toMatchObject({
      jira_issue_type: 'História',
      jira_issue_kind: 'story',
      jira_parent_key: 'ABC-100',
      jira_parent_summary: 'Épico de login'
    })

    const known = existing({
      jira_issue_type: 'História',
      jira_issue_kind: 'story',
      jira_parent_key: 'ABC-100',
      jira_parent_summary: 'Épico de login'
    })
    expect(planImport([story], linked(known), SITE, {})[0].type).toBe('noop')

    const moved = planImport(
      [{ ...story, parentKey: 'ABC-200', parentSummary: 'Outro épico' }],
      linked(known),
      SITE,
      {}
    )
    expect(moved[0]).toEqual({
      type: 'update',
      key: 'ABC-1',
      id: 9,
      patch: { jira_parent_key: 'ABC-200', jira_parent_summary: 'Outro épico' }
    })
  })

  it('não cria task para issue já concluída', () => {
    expect(planImport([issue({ statusCategory: 'done' })], new Map(), SITE, {})).toEqual([])
  })

  it('mudança de status no Jira só atualiza o status Jira, nunca o status local', () => {
    const [op] = planImport(
      [issue({ statusName: 'Concluído', statusCategory: 'done' })],
      linked(existing()),
      SITE,
      {}
    )
    expect(op).toEqual({
      type: 'update',
      key: 'ABC-1',
      id: 9,
      patch: { jira_status: 'Concluído' }
    })
  })

  it('task nova vai para o projeto mapeado do espaço', () => {
    const [op] = planImport([issue()], new Map(), SITE, {}, { CON: 3 })
    expect(op.type === 'create' && op.fields.project_id).toBe(3)
  })

  it('projeto do espaço só preenche task vinculada sem projeto', () => {
    const noProject = planImport(
      [issue()],
      linked(existing({ project_id: null })),
      SITE,
      {},
      {
        CON: 3
      }
    )
    expect(noProject[0]).toEqual({ type: 'update', key: 'ABC-1', id: 9, patch: { project_id: 3 } })
    const moved = planImport([issue()], linked(existing({ project_id: 8 })), SITE, {}, { CON: 3 })
    expect(moved[0].type).toBe('noop')
  })

  it('preenche o espaço de task vinculada antes dele existir', () => {
    const [op] = planImport([issue()], linked(existing({ jira_space: null })), SITE, {})
    expect(op).toEqual({
      type: 'update',
      key: 'ABC-1',
      id: 9,
      patch: { jira_space: 'Conecta' }
    })
  })

  it('não gera mudança quando nada mudou no Jira', () => {
    expect(planImport([issue()], linked(existing()), SITE, {})).toEqual([
      { type: 'noop', key: 'ABC-1', id: 9 }
    ])
  })

  it('não apaga prazo local quando a issue não tem prazo, e atualiza quando tem', () => {
    const local = existing({ due_date: '2026-11-01T00:00:00' })
    expect(planImport([issue({ dueDate: null })], linked(local), SITE, {})[0].type).toBe('noop')
    expect(planImport([issue({ dueDate: '2026-11-01' })], linked(local), SITE, {})[0].type).toBe(
      'noop'
    )
    expect(planImport([issue({ dueDate: '2026-12-01' })], linked(local), SITE, {})[0]).toEqual({
      type: 'update',
      key: 'ABC-1',
      id: 9,
      patch: { due_date: '2026-12-01' }
    })
  })

  it('atualiza o título quando ele muda no Jira', () => {
    expect(planImport([issue({ summary: 'Novo' })], linked(existing()), SITE, {})[0]).toEqual({
      type: 'update',
      key: 'ABC-1',
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

describe('planDescriptionImport', () => {
  const adf = (text: string): DocNode => ({
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  })
  const notes = (text: string): string =>
    JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
    })

  it('não faz nada quando a descrição não mudou desde a última leitura', () => {
    const plan = planDescriptionImport(adf('a'), 'h1', { notes: notes('x'), jira_desc_hash: 'h1' })
    expect(plan).toEqual({ type: 'none' })
  })

  it('descrição alterada no Jira substitui as notas', () => {
    const plan = planDescriptionImport(adf('novo'), 'h2', {
      notes: notes('x'),
      jira_desc_hash: 'h1'
    })
    expect(plan).toEqual({ type: 'replace', notes: notes('novo') })
  })

  it('descrição esvaziada no Jira limpa as notas', () => {
    const empty = { type: 'doc', version: 1, content: [] }
    const plan = planDescriptionImport(empty, 'h2', { notes: notes('x'), jira_desc_hash: 'h1' })
    expect(plan).toEqual({ type: 'replace', notes: null })
  })

  it('primeira leitura com notas vazias copia a descrição', () => {
    const plan = planDescriptionImport(adf('a'), 'h', { notes: null, jira_desc_hash: null })
    expect(plan).toEqual({ type: 'replace', notes: notes('a') })
  })

  it('primeira leitura com notas locais e Jira vazio envia as notas', () => {
    const plan = planDescriptionImport(null, 'h', { notes: notes('local'), jira_desc_hash: null })
    expect(plan).toEqual({ type: 'push' })
  })

  it('primeira leitura com os dois lados preenchidos junta sem perder nada', () => {
    const plan = planDescriptionImport(adf('jira'), 'h', {
      notes: notes('local'),
      jira_desc_hash: null
    })
    expect(plan.type).toBe('merge')
    const doc = JSON.parse((plan as { notes: string }).notes)
    expect(doc.content.map((n: { type: string }) => n.type)).toEqual([
      'paragraph',
      'horizontalRule',
      'paragraph'
    ])
  })
})
