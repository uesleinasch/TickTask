import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createNotebook,
  createPage,
  createSection,
  deleteNotebook,
  deletePage,
  deleteSection,
  ensureNotebookSchema,
  getNotionPageId,
  getPage,
  listNotebookPageIds,
  listPageSubtree,
  locatePage,
  searchPages,
  setNotionPageId,
  listNotebooks,
  listPages,
  listSections,
  movePage,
  reorderNotebooks,
  reorderSections,
  updateNotebook,
  updatePageNotes,
  updatePageTitle
} from './notebookQueries'
import type { SqliteLike } from './tagQueries'

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

const LEGACY_SCHEMA = `
  CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
  CREATE TABLE note_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    asset_id TEXT NOT NULL UNIQUE,
    filename TEXT,
    mime TEXT,
    content_hash TEXT,
    notion_file_upload_id TEXT,
    notion_uploaded_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`

let raw: DatabaseSync
let db: SqliteLike

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(LEGACY_SCHEMA)
  db = adapt(raw)
})

function titles(sectionId: number): string[] {
  return listPages(db, sectionId).map((p) => p.title)
}

describe('migração de note_assets', () => {
  it('preserva as imagens das tasks e passa a aceitar página como dona', () => {
    raw.exec("INSERT INTO tasks (id, name) VALUES (1, 'task')")
    raw.exec(
      "INSERT INTO note_assets (task_id, asset_id, filename, mime, content_hash, notion_file_upload_id, created_at) VALUES (1, 'a1', 'a1.png', 'image/png', 'h', 'up1', 10)"
    )

    ensureNotebookSchema(db)
    ensureNotebookSchema(db)

    expect(
      raw.prepare('SELECT task_id, page_id, notion_file_upload_id FROM note_assets').all()
    ).toEqual([{ task_id: 1, page_id: null, notion_file_upload_id: 'up1' }])

    const nb = createNotebook(db, { name: 'Caderno' })
    const section = listSections(db, nb.id)[0]
    const page = createPage(db, { section_id: section.id, title: 'P' })
    raw.exec(
      `INSERT INTO note_assets (page_id, asset_id, created_at) VALUES (${page.id}, 'a2', 11)`
    )
    expect(() =>
      raw.exec(
        "INSERT INTO note_assets (task_id, page_id, asset_id, created_at) VALUES (1, 1, 'a3', 12)"
      )
    ).toThrow()
    expect(() =>
      raw.exec("INSERT INTO note_assets (asset_id, created_at) VALUES ('a4', 13)")
    ).toThrow()

    deletePage(db, page.id)
    raw.exec('DELETE FROM tasks WHERE id = 1')
    expect(raw.prepare('SELECT COUNT(*) AS n FROM note_assets').get()).toEqual({ n: 0 })
    expect(raw.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
  })
})

describe('cadernos e seções', () => {
  beforeEach(() => ensureNotebookSchema(db))

  it('caderno novo nasce com a seção Geral e vai para o fim da ordem', () => {
    const a = createNotebook(db, { name: ' Trabalho ' })
    const b = createNotebook(db, { name: 'Pessoal', color: '#22c55e' })
    expect(listNotebooks(db).map((n) => [n.name, n.position, n.color])).toEqual([
      ['Trabalho', 0, '#6366f1'],
      ['Pessoal', 1, '#22c55e']
    ])
    expect(listSections(db, a.id).map((s) => s.name)).toEqual(['Geral'])

    reorderNotebooks(db, [b.id, a.id])
    expect(listNotebooks(db).map((n) => n.name)).toEqual(['Pessoal', 'Trabalho'])
  })

  it('recusa nome vazio', () => {
    expect(() => createNotebook(db, { name: '  ' })).toThrow()
    const nb = createNotebook(db, { name: 'X' })
    expect(() => updateNotebook(db, nb.id, { name: '' })).toThrow()
  })

  it('reordena só as seções do caderno', () => {
    const nb = createNotebook(db, { name: 'A' })
    const other = createNotebook(db, { name: 'B' })
    const geral = listSections(db, nb.id)[0]
    const s2 = createSection(db, { notebook_id: nb.id, name: 'Reuniões' })
    const foreign = listSections(db, other.id)[0]
    reorderSections(db, nb.id, [s2.id, foreign.id, geral.id])
    expect(listSections(db, nb.id).map((s) => s.name)).toEqual(['Reuniões', 'Geral'])
    expect(listSections(db, other.id)[0].position).toBe(0)
  })

  it('apagar caderno ou seção apaga as páginas e devolve os ids', () => {
    const nb = createNotebook(db, { name: 'A' })
    const geral = listSections(db, nb.id)[0]
    const s2 = createSection(db, { notebook_id: nb.id, name: 'S2' })
    const p1 = createPage(db, { section_id: geral.id, title: '1' })
    const p2 = createPage(db, { section_id: s2.id, title: '2' })
    const sub = createPage(db, { section_id: s2.id, parent_page_id: p2.id, title: '2.1' })

    expect(deleteSection(db, s2.id).sort()).toEqual([p2.id, sub.id].sort())
    expect(getPage(db, sub.id)).toBeUndefined()
    expect(deleteNotebook(db, nb.id)).toEqual([p1.id])
    expect(raw.prepare('SELECT COUNT(*) AS n FROM notebook_pages').get()).toEqual({ n: 0 })
  })
})

describe('páginas', () => {
  let sectionId: number
  let otherSectionId: number

  beforeEach(() => {
    ensureNotebookSchema(db)
    const nb = createNotebook(db, { name: 'A' })
    sectionId = listSections(db, nb.id)[0].id
    otherSectionId = createSection(db, { notebook_id: nb.id, name: 'Outra' }).id
  })

  it('listagem não traz notes nem drawing; getPage traz', () => {
    const page = createPage(db, { section_id: sectionId, title: 'P' })
    updatePageNotes(db, page.id, '{"type":"doc"}')
    expect(listPages(db, sectionId)[0]).not.toHaveProperty('notes')
    expect(getPage(db, page.id)?.notes).toBe('{"type":"doc"}')
  })

  it('subpáginas vão até 2 níveis e o pai precisa estar na mesma seção', () => {
    const p = createPage(db, { section_id: sectionId, title: 'p' })
    const s = createPage(db, { section_id: sectionId, parent_page_id: p.id })
    const ss = createPage(db, { section_id: sectionId, parent_page_id: s.id })
    expect(() => createPage(db, { section_id: sectionId, parent_page_id: ss.id })).toThrow(
      /2 níveis/
    )
    expect(() => createPage(db, { section_id: otherSectionId, parent_page_id: p.id })).toThrow()
  })

  it('posição é por irmãos', () => {
    const a = createPage(db, { section_id: sectionId, title: 'a' })
    const b = createPage(db, { section_id: sectionId, title: 'b' })
    const sub = createPage(db, { section_id: sectionId, parent_page_id: a.id, title: 'a1' })
    expect([a.position, b.position, sub.position]).toEqual([0, 1, 0])
  })

  it('apagar página leva as subpáginas', () => {
    const a = createPage(db, { section_id: sectionId, title: 'a' })
    const a1 = createPage(db, { section_id: sectionId, parent_page_id: a.id, title: 'a1' })
    const a11 = createPage(db, { section_id: sectionId, parent_page_id: a1.id, title: 'a11' })
    createPage(db, { section_id: sectionId, title: 'b' })
    expect(deletePage(db, a.id).sort()).toEqual([a.id, a1.id, a11.id].sort())
    expect(titles(sectionId)).toEqual(['b'])
  })

  it('reordena entre irmãos', () => {
    const a = createPage(db, { section_id: sectionId, title: 'a' })
    createPage(db, { section_id: sectionId, title: 'b' })
    createPage(db, { section_id: sectionId, title: 'c' })
    movePage(db, a.id, { section_id: sectionId, parent_page_id: null, index: 2 })
    expect(titles(sectionId)).toEqual(['b', 'c', 'a'])
  })

  it('move para outra seção levando a subárvore', () => {
    const a = createPage(db, { section_id: sectionId, title: 'a' })
    const a1 = createPage(db, { section_id: sectionId, parent_page_id: a.id, title: 'a1' })
    createPage(db, { section_id: otherSectionId, title: 'x' })
    movePage(db, a.id, { section_id: otherSectionId, parent_page_id: null, index: 0 })
    expect(titles(sectionId)).toEqual([])
    expect(getPage(db, a1.id)).toMatchObject({ section_id: otherSectionId, parent_page_id: a.id })
    expect(
      listPages(db, otherSectionId)
        .filter((p) => p.parent_page_id === null)
        .map((p) => p.title)
    ).toEqual(['a', 'x'])
  })

  it('recusa movimento que passa do limite ou cria ciclo', () => {
    const a = createPage(db, { section_id: sectionId, title: 'a' })
    const a1 = createPage(db, { section_id: sectionId, parent_page_id: a.id })
    const b = createPage(db, { section_id: sectionId, title: 'b' })
    const b1 = createPage(db, { section_id: sectionId, parent_page_id: b.id })
    expect(() =>
      movePage(db, a.id, { section_id: sectionId, parent_page_id: b1.id, index: 0 })
    ).toThrow()
    expect(() =>
      movePage(db, a.id, { section_id: sectionId, parent_page_id: a1.id, index: 0 })
    ).toThrow()
    expect(() =>
      movePage(db, a.id, { section_id: otherSectionId, parent_page_id: b.id, index: 0 })
    ).toThrow()
    movePage(db, a1.id, { section_id: sectionId, parent_page_id: b1.id, index: 0 })
    expect(getPage(db, a1.id)?.parent_page_id).toBe(b1.id)
  })

  it('título é aparado', () => {
    const a = createPage(db, { section_id: sectionId })
    updatePageTitle(db, a.id, '  Ata  ')
    expect(getPage(db, a.id)?.title).toBe('Ata')
  })
})

describe('vínculo com o Notion', () => {
  beforeEach(() => ensureNotebookSchema(db))

  it('grava e lê o notion_page_id sem tocar em updated_at', () => {
    const nb = createNotebook(db, { name: 'A' })
    raw.exec(`UPDATE notebooks SET updated_at = '2000-01-01 00:00:00' WHERE id = ${nb.id}`)
    setNotionPageId(db, 'notebook', nb.id, 'abc')
    expect(getNotionPageId(db, 'notebook', nb.id)).toBe('abc')
    expect(listNotebooks(db)[0].updated_at).toBe('2000-01-01 00:00:00')
    setNotionPageId(db, 'notebook', nb.id, null)
    expect(getNotionPageId(db, 'notebook', nb.id)).toBeNull()
    expect(getNotionPageId(db, 'page', 999)).toBeNull()
  })

  it('lista subárvore e páginas do caderno com pais antes dos filhos', () => {
    const nb = createNotebook(db, { name: 'A' })
    const geral = listSections(db, nb.id)[0]
    const outra = createSection(db, { notebook_id: nb.id, name: 'B' })
    const a = createPage(db, { section_id: geral.id, title: 'a' })
    const b = createPage(db, { section_id: geral.id, title: 'b' })
    const a1 = createPage(db, { section_id: geral.id, parent_page_id: a.id })
    const a11 = createPage(db, { section_id: geral.id, parent_page_id: a1.id })
    const x = createPage(db, { section_id: outra.id, title: 'x' })

    expect(listPageSubtree(db, a.id)).toEqual([a.id, a1.id, a11.id])
    expect(listPageSubtree(db, 999)).toEqual([])
    expect(listNotebookPageIds(db, nb.id)).toEqual([a.id, a1.id, a11.id, b.id, x.id])
  })
})

describe('busca', () => {
  const note = (text: string): string =>
    JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
    })

  beforeEach(() => ensureNotebookSchema(db))

  it('acha por título e por texto, título primeiro, com trecho e caminho', () => {
    const nb = createNotebook(db, { name: 'Trabalho' })
    const section = listSections(db, nb.id)[0]
    const byText = createPage(db, { section_id: section.id, title: 'Ata' })
    updatePageNotes(db, byText.id, note('Discutimos o orçamento de 2027 com a diretoria'))
    const byTitle = createPage(db, { section_id: section.id, title: 'Orçamento' })
    createPage(db, { section_id: section.id, title: 'Outra' })

    const results = searchPages(db, 'orçamento')
    expect(results.map((r) => r.id)).toEqual([byTitle.id, byText.id])
    expect(results[1]).toMatchObject({
      notebook_name: 'Trabalho',
      section_name: 'Geral',
      snippet: 'Discutimos o orçamento de 2027 com a diretoria'
    })
    expect(results[1]).not.toHaveProperty('search_text')
  })

  it('trata % e _ como texto e ignora busca vazia', () => {
    const nb = createNotebook(db, { name: 'A' })
    const section = listSections(db, nb.id)[0]
    createPage(db, { section_id: section.id, title: '100% pronto' })
    createPage(db, { section_id: section.id, title: '1000 pronto' })
    expect(searchPages(db, '100%').map((r) => r.title)).toEqual(['100% pronto'])
    expect(searchPages(db, '  ')).toEqual([])
  })

  it('preenche search_text de páginas que já existiam antes da coluna', () => {
    raw.exec('ALTER TABLE notebook_pages DROP COLUMN search_text')
    const nb = createNotebook(db, { name: 'A' })
    const section = listSections(db, nb.id)[0]
    raw.exec(
      `INSERT INTO notebook_pages (section_id, title, notes) VALUES (${section.id}, 'velha', '${note('texto antigo')}')`
    )
    ensureNotebookSchema(db)
    expect(searchPages(db, 'antigo').map((r) => r.title)).toEqual(['velha'])
  })

  it('localiza caderno e seção da página', () => {
    const nb = createNotebook(db, { name: 'A' })
    const section = listSections(db, nb.id)[0]
    const page = createPage(db, { section_id: section.id })
    expect(locatePage(db, page.id)).toEqual({
      page_id: page.id,
      section_id: section.id,
      notebook_id: nb.id
    })
    expect(locatePage(db, 999)).toBeNull()
  })
})
