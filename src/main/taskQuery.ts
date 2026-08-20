import type { TaskCategory, TaskStatus } from '@shared/types'

export type TaskSort = 'updated' | 'due_date'

export interface TaskListFilters {
  archived?: boolean
  status?: TaskStatus | 'all'
  category?: TaskCategory | 'all'
  projectId?: number | 'none' | null
  tagId?: number | null
  contextId?: number | null
  search?: string
  blockedOnly?: boolean
  sort?: TaskSort
  limit?: number
  offset?: number
}

const ORDER_BY: Record<TaskSort, string> = {
  updated: 't.updated_at DESC',
  due_date: 't.due_date IS NULL, t.due_date ASC'
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export function buildTaskListWhere(filters: TaskListFilters): {
  clause: string
  params: unknown[]
} {
  const conditions = ['t.is_archived = ?', 't.parent_task_id IS NULL']
  const params: unknown[] = [filters.archived ? 1 : 0]

  if (filters.status && filters.status !== 'all') {
    conditions.push('t.status = ?')
    params.push(filters.status)
  }

  if (filters.category && filters.category !== 'all') {
    conditions.push('t.category = ?')
    params.push(filters.category)
  }

  if (filters.projectId === 'none') {
    conditions.push('t.project_id IS NULL')
  } else if (typeof filters.projectId === 'number') {
    conditions.push('t.project_id = ?')
    params.push(filters.projectId)
  }

  if (typeof filters.tagId === 'number') {
    conditions.push('EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id AND tt.tag_id = ?)')
    params.push(filters.tagId)
  }

  if (typeof filters.contextId === 'number') {
    conditions.push(
      'EXISTS (SELECT 1 FROM task_contexts tc WHERE tc.task_id = t.id AND tc.context_id = ?)'
    )
    params.push(filters.contextId)
  }

  const search = filters.search?.trim()
  if (search) {
    conditions.push("(t.name LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')")
    const pattern = `%${escapeLike(search)}%`
    params.push(pattern, pattern)
  }

  if (filters.blockedOnly) {
    conditions.push(`EXISTS (
      SELECT 1 FROM task_dependencies d
      JOIN tasks dep ON dep.id = d.depends_on_task_id
      WHERE d.task_id = t.id AND dep.status != 'finalizada'
    )`)
  }

  return { clause: conditions.join(' AND '), params }
}

export function buildTaskListQuery(
  columns: string,
  filters: TaskListFilters
): { sql: string; params: unknown[] } {
  const { clause, params } = buildTaskListWhere(filters)
  const orderBy = ORDER_BY[filters.sort as TaskSort] ?? ORDER_BY.updated

  let sql = `
    SELECT ${columns}
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE ${clause}
    ORDER BY ${orderBy}
  `

  if (typeof filters.limit === 'number') {
    if (typeof filters.offset === 'number') {
      sql += ' LIMIT ? OFFSET ?'
      params.push(filters.limit, filters.offset)
    } else {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }
  }

  return { sql, params }
}

export function buildTaskCountQuery(filters: TaskListFilters): {
  sql: string
  params: unknown[]
} {
  const { clause, params } = buildTaskListWhere(filters)

  return {
    sql: `
      SELECT COUNT(*) as total
      FROM tasks t
      WHERE ${clause}
    `,
    params
  }
}
