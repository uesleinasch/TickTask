import { describe, expect, it } from 'vitest'
import type { JiraField } from '@shared/types'
import { describeIssueFields, toJiraValue, type RawIssueWithMeta } from './jiraFields'

const issue: RawIssueWithMeta = {
  fields: {
    summary: 'Título',
    description: { type: 'doc', content: [] },
    priority: { id: '3', name: 'Medium' },
    duedate: '2026-11-20',
    labels: ['api'],
    assignee: { accountId: 'u1', displayName: 'Marco' },
    customfield_10016: 8,
    customfield_10020: [
      { id: 10, name: 'CON 18', state: 'closed', boardId: 4 },
      { id: 11, name: 'CON 19', state: 'active', boardId: 4 }
    ],
    customfield_200: { id: '1', value: 'Aprovado' },
    customfield_201: [{ id: '7', value: 'Web' }],
    customfield_202: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'obs' }] }]
    },
    customfield_203: { id: 'team-1', name: 'Squad A' }
  },
  editmeta: {
    fields: {
      summary: {
        name: 'Resumo',
        required: true,
        schema: { type: 'string', system: 'summary' },
        operations: ['set']
      },
      description: { name: 'Descrição', schema: { type: 'string' }, operations: ['set'] },
      priority: {
        name: 'Prioridade',
        schema: { type: 'priority' },
        operations: ['set'],
        allowedValues: [
          { id: '2', name: 'High' },
          { id: '3', name: 'Medium' }
        ]
      },
      duedate: { name: 'Data de entrega', schema: { type: 'date' }, operations: ['set'] },
      labels: {
        name: 'Rótulos',
        schema: { type: 'array', items: 'string' },
        operations: ['add', 'set', 'remove']
      },
      assignee: { name: 'Responsável', schema: { type: 'user' }, operations: ['set'] },
      customfield_10016: { name: 'Story Points', schema: { type: 'number' }, operations: ['set'] },
      customfield_10020: {
        name: 'Sprint',
        schema: { type: 'array', items: 'json', custom: 'com.pyxis.greenhopper.jira:gh-sprint' },
        operations: ['set']
      },
      customfield_200: {
        name: 'DoR',
        schema: { type: 'option' },
        operations: ['set'],
        allowedValues: [
          { id: '1', value: 'Aprovado' },
          { id: '2', value: 'Reprovado' }
        ]
      },
      customfield_201: {
        name: 'Equipe',
        schema: { type: 'array', items: 'option' },
        operations: ['add', 'set', 'remove'],
        allowedValues: [{ id: '7', value: 'Web' }]
      },
      customfield_202: {
        name: 'Observação',
        schema: {
          type: 'string',
          custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea'
        },
        operations: ['set']
      },
      customfield_203: {
        name: 'Team',
        schema: {
          type: 'team',
          custom: 'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team'
        },
        operations: ['set']
      }
    }
  }
}

const byId = (fields: JiraField[]): Record<string, JiraField> =>
  Object.fromEntries(fields.map((f) => [f.id, f]))

describe('describeIssueFields', () => {
  const fields = describeIssueFields(issue, [{ id: '12', label: 'CON 20' }])
  const f = byId(fields)

  it('esconde descrição (vive nas notas) e começa pelos campos de sistema', () => {
    expect(f.description).toBeUndefined()
    expect(fields.slice(0, 5).map((x) => x.id)).toEqual([
      'summary',
      'assignee',
      'priority',
      'duedate',
      'labels'
    ])
  })

  it('reconhece o tipo de cada campo pelo schema', () => {
    expect(f.summary).toMatchObject({ kind: 'string', value: 'Título', required: true })
    expect(f.priority).toMatchObject({ kind: 'select', value: '3' })
    expect(f.duedate).toMatchObject({ kind: 'date', value: '2026-11-20' })
    expect(f.labels).toMatchObject({ kind: 'labels', value: ['api'] })
    expect(f.assignee).toMatchObject({
      kind: 'user',
      value: { accountId: 'u1', displayName: 'Marco' }
    })
    expect(f.customfield_10016).toMatchObject({ kind: 'number', value: 8 })
    expect(f.customfield_200).toMatchObject({
      kind: 'select',
      value: '1',
      options: [
        { id: '1', label: 'Aprovado' },
        { id: '2', label: 'Reprovado' }
      ]
    })
    expect(f.customfield_201).toMatchObject({ kind: 'multiselect', value: ['7'] })
    expect(f.customfield_202).toMatchObject({ kind: 'text', value: 'obs' })
    expect(f.customfield_203).toMatchObject({ kind: 'readonly', value: 'Squad A' })
  })

  it('sprint aponta a sprint aberta e inclui as opções dos boards', () => {
    expect(f.customfield_10020).toMatchObject({
      kind: 'sprint',
      value: 11,
      options: [
        { id: '11', label: 'CON 19' },
        { id: '12', label: 'CON 20' }
      ]
    })
  })

  it('campo sem operação set fica somente leitura', () => {
    const readonly = describeIssueFields({
      fields: { labels: ['a', 'b'] },
      editmeta: {
        fields: {
          labels: {
            name: 'Rótulos',
            schema: { type: 'array', items: 'string' },
            operations: ['add']
          }
        }
      }
    })
    expect(readonly[0]).toMatchObject({ kind: 'readonly', value: 'a, b' })
  })
})

describe('toJiraValue', () => {
  const f = byId(describeIssueFields(issue))

  it('monta o valor no formato que o PUT do Jira espera', () => {
    expect(toJiraValue(f.priority, '2')).toEqual({ id: '2' })
    expect(toJiraValue(f.customfield_201, ['7'])).toEqual([{ id: '7' }])
    expect(toJiraValue(f.assignee, 'u2')).toEqual({ accountId: 'u2' })
    expect(toJiraValue(f.customfield_10020, '12')).toBe(12)
    expect(toJiraValue(f.customfield_10016, '5')).toBe(5)
    expect(toJiraValue(f.labels, ['nova label'])).toEqual(['nova_label'])
    expect(toJiraValue(f.customfield_202, 'a')).toMatchObject({ type: 'doc', version: 1 })
  })

  it('vazio limpa o campo', () => {
    expect(toJiraValue(f.priority, null)).toBeNull()
    expect(toJiraValue(f.duedate, '')).toBeNull()
    expect(toJiraValue(f.customfield_10020, null)).toBeNull()
  })

  it('recusa número inválido e campo somente leitura', () => {
    expect(() => toJiraValue(f.customfield_10016, 'abc')).toThrow('Story Points')
    expect(() => toJiraValue(f.customfield_203, 'x')).toThrow('não pode ser editado')
  })
})
