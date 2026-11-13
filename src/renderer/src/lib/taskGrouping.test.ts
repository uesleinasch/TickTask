import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/types'
import { buildTaskGroups } from './taskGrouping'

let nextId = 1
const task = (over: Partial<Task> = {}): Task =>
  ({
    id: nextId++,
    name: `Task ${nextId}`,
    status: 'executando',
    category: 'normal',
    total_seconds: 0,
    is_running: false,
    is_archived: false,
    project_id: null,
    ...over
  }) as Task

const summary = (groups: ReturnType<typeof buildTaskGroups>): [string, string, number[]][] =>
  groups.map((g) => [g.key, g.label, g.tasks.map((t) => t.id)])

describe('buildTaskGroups', () => {
  it('agrupa por projeto em ordem alfabética com "Sem projeto" por último', () => {
    const a = task({ id: 1, project_id: 2, project_name: 'Zeta' })
    const b = task({ id: 2, project_id: 1, project_name: 'Alfa' })
    const c = task({ id: 3 })
    expect(summary(buildTaskGroups([a, b, c], 'project'))).toEqual([
      ['p:1', 'Alfa', [2]],
      ['p:2', 'Zeta', [1]],
      ['p:none', 'Sem projeto', [3]]
    ])
  })

  it('repete a task em cada contexto', () => {
    const ctx = (id: number, name: string): NonNullable<Task['contexts']>[number] => ({
      id,
      name,
      icon: '•',
      color: '#000',
      created_at: ''
    })
    const a = task({ id: 1, contexts: [ctx(1, '@dev'), ctx(2, '@casa')] })
    expect(summary(buildTaskGroups([a], 'context'))).toEqual([
      ['c:2', '@casa', [1]],
      ['c:1', '@dev', [1]]
    ])
  })

  it('agrupa pelo espaço do Jira, caindo no prefixo da chave', () => {
    const a = task({ id: 1, jira_key: 'CTL-1', jira_space: 'Connect Tech Lead' })
    const b = task({ id: 2, jira_key: 'ABC-9' })
    const c = task({ id: 3 })
    expect(summary(buildTaskGroups([a, b, c], 'jira_space'))).toEqual([
      ['s:ABC', 'ABC', [2]],
      ['s:Connect Tech Lead', 'Connect Tech Lead', [1]],
      ['s:none', 'Fora do Jira', [3]]
    ])
  })

  it('agrupa pela issue pai e põe a própria pai no topo do grupo', () => {
    const child = task({
      id: 1,
      jira_key: 'CTL-2',
      jira_parent_key: 'CTL-1',
      jira_parent_summary: 'Épico'
    })
    const parent = task({ id: 2, name: 'Épico local', jira_key: 'CTL-1' })
    const orphan = task({ id: 3, jira_key: 'CTL-3' })
    const remote = task({
      id: 4,
      jira_key: 'CTL-5',
      jira_parent_key: 'CTL-4',
      jira_parent_summary: 'História'
    })
    expect(summary(buildTaskGroups([child, parent, orphan, remote], 'jira_parent'))).toEqual([
      ['j:CTL-1', 'CTL-1 · Épico', [2, 1]],
      ['j:CTL-4', 'CTL-4 · História', [4]],
      ['j:none', 'Sem issue pai', [3]]
    ])
  })
})
