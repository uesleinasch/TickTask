import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  listTagsWithUsage,
  listTaskIdsWithTag,
  mergeTags,
  updateTag,
  type SqliteLike
} from './tagQueries'

// O binário do better-sqlite3 é compilado para o ABI do Electron e não carrega sob o Node do
// vitest. node:sqlite é o mesmo SQLite; o adaptador reproduz a API que as funções consomem.
function adapt(raw: DatabaseSync): SqliteLike {
  return {
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => {
      raw.exec('BEGIN')
      try {
        fn()
        raw.exec('COMMIT')
      } catch (error) {
        raw.exec('ROLLBACK')
        throw error
      }
    }
  }
}

let raw: DatabaseSync
let db: SqliteLike

function seedTag(name: string, color = '#6366f1'): number {
  return Number(
    db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color).lastInsertRowid
  )
}

function seedTask(name: string): number {
  return Number(db.prepare('INSERT INTO tasks (name) VALUES (?)').run(name).lastInsertRowid)
}

function link(taskId: number, tagId: number): void {
  db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId)
}

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  db = adapt(raw)
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(`
    CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)
})

describe('updateTag', () => {
  it('renomeia e troca a cor', () => {
    const id = seedTag('urgnete')

    updateTag(db, id, { name: 'urgente', color: '#ef4444' })

    const tag = db.prepare('SELECT name, color FROM tags WHERE id = ?').get(id)
    expect(tag).toEqual({ name: 'urgente', color: '#ef4444' })
  })

  it('remove espaços das pontas do nome', () => {
    const id = seedTag('casa')

    updateTag(db, id, { name: '  trabalho  ' })

    expect(db.prepare('SELECT name FROM tags WHERE id = ?').get(id)).toEqual({ name: 'trabalho' })
  })

  it('recusa nome já usado por outra tag, sem alterar nada', () => {
    const alvo = seedTag('urgente')
    const outra = seedTag('casa', '#22c55e')

    expect(() => updateTag(db, outra, { name: 'urgente' })).toThrow(/já existe/i)
    expect(db.prepare('SELECT name, color FROM tags WHERE id = ?').get(outra)).toEqual({
      name: 'casa',
      color: '#22c55e'
    })
    expect(db.prepare('SELECT name FROM tags WHERE id = ?').get(alvo)).toEqual({ name: 'urgente' })
  })

  it('recusa nome que difere apenas por maiúsculas — esse é o caso que se resolve mesclando', () => {
    seedTag('urgente')
    const outra = seedTag('Casa')

    expect(() => updateTag(db, outra, { name: 'URGENTE' })).toThrow(/já existe/i)
  })

  it('aceita renomear a tag para o mesmo nome que ela já tem', () => {
    const id = seedTag('urgente')

    expect(() => updateTag(db, id, { name: 'urgente', color: '#000000' })).not.toThrow()
    expect(db.prepare('SELECT color FROM tags WHERE id = ?').get(id)).toEqual({ color: '#000000' })
  })

  it('não escreve nada quando não há campo para atualizar', () => {
    const id = seedTag('urgente')

    updateTag(db, id, {})

    expect(db.prepare('SELECT name FROM tags WHERE id = ?').get(id)).toEqual({ name: 'urgente' })
  })
})

describe('listTagsWithUsage', () => {
  it('conta em quantas tarefas cada tag está, inclusive as não usadas', () => {
    const urgente = seedTag('urgente')
    const casa = seedTag('casa')
    seedTag('orfa')
    const t1 = seedTask('t1')
    const t2 = seedTask('t2')
    link(t1, urgente)
    link(t2, urgente)
    link(t2, casa)

    const result = listTagsWithUsage(db)

    expect(result).toEqual([
      expect.objectContaining({ id: casa, name: 'casa', task_count: 1 }),
      expect.objectContaining({ id: expect.any(Number), name: 'orfa', task_count: 0 }),
      expect.objectContaining({ id: urgente, name: 'urgente', task_count: 2 })
    ])
  })
})

describe('listTaskIdsWithTag', () => {
  it('devolve os ids das tarefas que têm a tag', () => {
    const tag = seedTag('urgente')
    const t1 = seedTask('t1')
    const t2 = seedTask('t2')
    seedTask('sem tag')
    link(t1, tag)
    link(t2, tag)

    expect(listTaskIdsWithTag(db, tag)).toEqual([t1, t2])
  })

  it('devolve lista vazia para tag sem uso', () => {
    expect(listTaskIdsWithTag(db, seedTag('orfa'))).toEqual([])
  })
})

describe('mergeTags', () => {
  it('move as tarefas da origem para o destino e apaga a origem', () => {
    const origem = seedTag('urgnete')
    const destino = seedTag('urgente')
    const tarefa = seedTask('relatório')
    link(tarefa, origem)

    const affected = mergeTags(db, origem, destino)

    expect(affected).toEqual([tarefa])
    expect(db.prepare('SELECT tag_id FROM task_tags WHERE task_id = ?').all(tarefa)).toEqual([
      { tag_id: destino }
    ])
    expect(db.prepare('SELECT id FROM tags WHERE id = ?').get(origem)).toBeUndefined()
  })

  it('não duplica nem estoura quando a tarefa já tem as duas tags', () => {
    const origem = seedTag('urgnete')
    const destino = seedTag('urgente')
    const tarefa = seedTask('relatório')
    link(tarefa, origem)
    link(tarefa, destino)

    const affected = mergeTags(db, origem, destino)

    expect(affected).toEqual([tarefa])
    expect(db.prepare('SELECT tag_id FROM task_tags WHERE task_id = ?').all(tarefa)).toEqual([
      { tag_id: destino }
    ])
  })

  it('preserva as tarefas que já eram só do destino', () => {
    const origem = seedTag('urgnete')
    const destino = seedTag('urgente')
    const daOrigem = seedTask('a')
    const doDestino = seedTask('b')
    link(daOrigem, origem)
    link(doDestino, destino)

    mergeTags(db, origem, destino)

    expect(
      db.prepare('SELECT task_id FROM task_tags WHERE tag_id = ? ORDER BY task_id').all(destino)
    ).toEqual([{ task_id: daOrigem }, { task_id: doDestino }])
  })

  it('não mexe em tags que não participam do merge', () => {
    const origem = seedTag('urgnete')
    const destino = seedTag('urgente')
    const intacta = seedTag('casa')
    const tarefa = seedTask('a')
    link(tarefa, origem)
    link(tarefa, intacta)

    mergeTags(db, origem, destino)

    expect(
      db.prepare('SELECT tag_id FROM task_tags WHERE task_id = ? ORDER BY tag_id').all(tarefa)
    ).toEqual([{ tag_id: destino }, { tag_id: intacta }].sort((a, b) => a.tag_id - b.tag_id))
  })

  it('recusa mesclar uma tag com ela mesma', () => {
    const tag = seedTag('urgente')

    expect(() => mergeTags(db, tag, tag)).toThrow(/ela mesma/i)
  })

  it('recusa quando a origem não existe', () => {
    const destino = seedTag('urgente')

    expect(() => mergeTags(db, 999, destino)).toThrow(/não encontrada/i)
  })

  it('recusa quando o destino não existe', () => {
    const origem = seedTag('urgente')

    expect(() => mergeTags(db, origem, 999)).toThrow(/não encontrada/i)
    expect(db.prepare('SELECT id FROM tags WHERE id = ?').get(origem)).toBeDefined()
  })
})
