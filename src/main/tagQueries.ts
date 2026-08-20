// Interface mínima em vez do tipo do better-sqlite3: o binário do driver é compilado para o ABI
// do Electron e não carrega sob o Node do vitest, então os testes injetam node:sqlite.
export type SqliteParam = string | number | bigint | Uint8Array

export interface SqliteStatement {
  run: (...params: SqliteParam[]) => unknown
  get: (...params: SqliteParam[]) => unknown
  all: (...params: SqliteParam[]) => unknown[]
}

export interface SqliteLike {
  prepare: (sql: string) => SqliteStatement
  transaction: (fn: () => void) => () => void
}

import type { UpdateTagInput } from '@shared/types'

export interface TagUsageRow {
  id: number
  name: string
  color: string
  created_at: string
  task_count: number
}

export function updateTag(db: SqliteLike, id: number, data: UpdateTagInput): void {
  const updates: string[] = []
  const values: SqliteParam[] = []

  if (data.name !== undefined) {
    const name = data.name.trim()
    // A UNIQUE de tags.name é sensível a maiúsculas, então "Urgente" e "urgente" coexistiriam —
    // é justamente a duplicata que esta tela existe para resolver. Recusa e sugere mesclar.
    const clash = db
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE AND id != ?')
      .get(name, id)
    if (clash) {
      throw new Error(`Já existe uma tag chamada "${name}". Use mesclar para uni-las.`)
    }
    updates.push('name = ?')
    values.push(name)
  }

  if (data.color !== undefined) {
    updates.push('color = ?')
    values.push(data.color)
  }

  if (updates.length === 0) return

  values.push(id)
  db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values)
}

export function listTagsWithUsage(db: SqliteLike): TagUsageRow[] {
  return db
    .prepare(
      `
    SELECT t.id, t.name, t.color, t.created_at, COUNT(tt.task_id) as task_count
    FROM tags t
    LEFT JOIN task_tags tt ON tt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name COLLATE NOCASE ASC
  `
    )
    .all() as TagUsageRow[]
}

export function listTaskIdsWithTag(db: SqliteLike, tagId: number): number[] {
  const rows = db
    .prepare('SELECT task_id FROM task_tags WHERE tag_id = ? ORDER BY task_id')
    .all(tagId) as { task_id: number }[]
  return rows.map((row) => row.task_id)
}

/** Move os vínculos da tag origem para a destino e apaga a origem. Devolve as tarefas afetadas. */
export function mergeTags(db: SqliteLike, sourceId: number, targetId: number): number[] {
  if (sourceId === targetId) {
    throw new Error('Não é possível mesclar uma tag com ela mesma.')
  }

  const source = db.prepare('SELECT id FROM tags WHERE id = ?').get(sourceId)
  if (!source) throw new Error('Tag de origem não encontrada.')
  const target = db.prepare('SELECT id FROM tags WHERE id = ?').get(targetId)
  if (!target) throw new Error('Tag de destino não encontrada.')

  const affected = listTaskIdsWithTag(db, sourceId)

  db.transaction(() => {
    // OR IGNORE cobre a tarefa que já tem as duas tags: a PK (task_id, tag_id) rejeita o
    // vínculo repetido em vez de abortar a transação.
    db.prepare(
      `
      INSERT OR IGNORE INTO task_tags (task_id, tag_id)
      SELECT task_id, ? FROM task_tags WHERE tag_id = ?
    `
    ).run(targetId, sourceId)
    db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(sourceId)
    db.prepare('DELETE FROM tags WHERE id = ?').run(sourceId)
  })()

  return affected
}
