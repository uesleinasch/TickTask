import type { Task } from '@shared/types'
import type { TaskGroup } from '@renderer/components/TaskGroups'

export type GroupBy = 'project' | 'context' | 'jira_space' | 'jira_parent'

export const JIRA_GROUP_MODES: GroupBy[] = ['jira_space', 'jira_parent']

const byLabel = (a: TaskGroup, b: TaskGroup): number => a.label.localeCompare(b.label, 'pt-BR')

function collect(
  tasks: Task[],
  keysOf: (task: Task) => { key: string; label: string; color?: string; icon?: string }[],
  rest: { key: string; label: string }
): TaskGroup[] {
  const map = new Map<string, TaskGroup>()
  const leftover: Task[] = []
  for (const task of tasks) {
    const targets = keysOf(task)
    if (targets.length === 0) {
      leftover.push(task)
      continue
    }
    for (const target of targets) {
      let group = map.get(target.key)
      if (!group) {
        group = { ...target, tasks: [] }
        map.set(target.key, group)
      }
      group.tasks.push(task)
    }
  }
  const groups = Array.from(map.values()).sort(byLabel)
  if (leftover.length > 0) groups.push({ ...rest, tasks: leftover })
  return groups
}

export function buildTaskGroups(tasks: Task[], groupBy: GroupBy): TaskGroup[] {
  if (groupBy === 'project') {
    return collect(
      tasks,
      (task) =>
        task.project_id && task.project_name
          ? [{ key: `p:${task.project_id}`, label: task.project_name, color: task.project_color }]
          : [],
      { key: 'p:none', label: 'Sem projeto' }
    )
  }

  if (groupBy === 'context') {
    return collect(
      tasks,
      (task) =>
        (task.contexts ?? []).map((ctx) => ({
          key: `c:${ctx.id}`,
          label: ctx.name,
          color: ctx.color,
          icon: ctx.icon
        })),
      { key: 'c:none', label: 'Sem contexto' }
    )
  }

  if (groupBy === 'jira_space') {
    return collect(
      tasks,
      (task) => {
        const space = task.jira_space ?? task.jira_key?.split('-')[0]
        return space ? [{ key: `s:${space}`, label: space }] : []
      },
      { key: 's:none', label: 'Fora do Jira' }
    )
  }

  const parentSummaries = new Map<string, string | null>()
  for (const task of tasks) {
    if (task.jira_parent_key && !parentSummaries.get(task.jira_parent_key)) {
      parentSummaries.set(task.jira_parent_key, task.jira_parent_summary ?? null)
    }
  }
  const groups = collect(
    tasks,
    (task) => {
      const ownKey = task.jira_key && parentSummaries.has(task.jira_key) ? task.jira_key : null
      const key = ownKey ?? task.jira_parent_key
      if (!key) return []
      const summary = parentSummaries.get(key) ?? (ownKey ? task.name : null)
      return [{ key: `j:${key}`, label: summary ? `${key} · ${summary}` : key }]
    },
    { key: 'j:none', label: 'Sem issue pai' }
  )
  for (const group of groups) {
    const parentKey = group.key.slice(2)
    group.tasks.sort((a, b) => Number(b.jira_key === parentKey) - Number(a.jira_key === parentKey))
  }
  return groups
}
