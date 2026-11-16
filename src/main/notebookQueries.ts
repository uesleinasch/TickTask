import type {
  CreateNotebookInput,
  CreatePageInput,
  CreateSectionInput,
  MovePageInput,
  PageLocation,
  PageSearchResult,
  Notebook,
  NotebookPage,
  NotebookPageSummary,
  NotebookSection,
  UpdateNotebookInput,
  UpdateSectionInput
} from '@shared/types'
import {
  canPlaceUnder,
  flattenPageTree,
  siblingsOf,
  subtreeIds,
  type PageNode
} from '@shared/notebookTree'
import type { SqliteLike, SqliteParam } from './tagQueries'
import { notesPlainText, searchSnippet } from './notesPlainText'

export const DEFAULT_NOTEBOOK_COLOR = '#6366f1'
export const DEFAULT_SECTION_COLOR = '#0ea5e9'
export const DEFAULT_SECTION_NAME = 'Geral'

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS notebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '${DEFAULT_NOTEBOOK_COLOR}',
    position INTEGER NOT NULL DEFAULT 0,
    notion_page_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS notebook_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notebook_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '${DEFAULT_SECTION_COLOR}',
    position INTEGER NOT NULL DEFAULT 0,
    notion_page_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notebook_sections_notebook
    ON notebook_sections(notebook_id, position)`,
  `CREATE TABLE IF NOT EXISTS notebook_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    parent_page_id INTEGER,
    title TEXT NOT NULL DEFAULT '',
    notes TEXT,
    drawing TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    notion_page_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES notebook_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_page_id) REFERENCES notebook_pages(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notebook_pages_section
    ON notebook_pages(section_id, parent_page_id, position)`
]

export function ensureNotebookSchema(db: SqliteLike): void {
  for (const sql of SCHEMA) db.prepare(sql).run()
  addSearchTextColumn(db)
  migrateNoteAssetsOwner(db)
}

/** Texto puro das notas, derivado do JSON a cada save, para a busca rodar em SQL. */
function addSearchTextColumn(db: SqliteLike): void {
  const columns = db.prepare("PRAGMA table_info('notebook_pages')").all() as { name: string }[]
  if (columns.some((c) => c.name === 'search_text')) return
  db.prepare("ALTER TABLE notebook_pages ADD COLUMN search_text TEXT NOT NULL DEFAULT ''").run()
  const rows = db.prepare('SELECT id, notes FROM notebook_pages WHERE notes IS NOT NULL').all() as {
    id: number
    notes: string
  }[]
  const stmt = db.prepare('UPDATE notebook_pages SET search_text = ? WHERE id = ?')
  db.transaction(() => rows.forEach((r) => stmt.run(notesPlainText(r.notes), r.id)))()
}

/**
 * note_assets nasceu com task_id NOT NULL. Página também é dona de imagem, e SQLite não altera
 * NOT NULL/CHECK com ALTER TABLE: a tabela é recriada uma vez, copiando as linhas de task.
 */
export function migrateNoteAssetsOwner(db: SqliteLike): void {
  const columns = db.prepare("PRAGMA table_info('note_assets')").all() as { name: string }[]
  if (columns.length === 0 || columns.some((c) => c.name === 'page_id')) return

  // PRAGMA foreign_keys é ignorado dentro de transação; e linhas órfãs de task (de quando as FKs
  // estavam desligadas) fariam o INSERT falhar e travar a subida do app.
  db.prepare('PRAGMA foreign_keys = OFF').run()
  try {
    db.transaction(() => {
      db.prepare(
        `CREATE TABLE note_assets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER,
          page_id INTEGER,
          asset_id TEXT NOT NULL UNIQUE,
          filename TEXT,
          mime TEXT,
          content_hash TEXT,
          notion_file_upload_id TEXT,
          notion_uploaded_at INTEGER,
          created_at INTEGER NOT NULL,
          CHECK ((task_id IS NULL) <> (page_id IS NULL)),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (page_id) REFERENCES notebook_pages(id) ON DELETE CASCADE
        )`
      ).run()
      db.prepare(
        `INSERT INTO note_assets_new (id, task_id, asset_id, filename, mime, content_hash,
           notion_file_upload_id, notion_uploaded_at, created_at)
         SELECT id, task_id, asset_id, filename, mime, content_hash,
           notion_file_upload_id, notion_uploaded_at, created_at
         FROM note_assets`
      ).run()
      db.prepare('DROP TABLE note_assets').run()
      db.prepare('ALTER TABLE note_assets_new RENAME TO note_assets').run()
    })()
  } finally {
    db.prepare('PRAGMA foreign_keys = ON').run()
  }
}

function insertId(result: unknown): number {
  return Number((result as { lastInsertRowid: number | bigint }).lastInsertRowid)
}

function requireName(name: string, what: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error(`O nome do ${what} não pode ficar vazio.`)
  return trimmed
}

function nextPosition(db: SqliteLike, sql: string, ...params: SqliteParam[]): number {
  const row = db.prepare(sql).get(...params) as { next: number | null }
  return row.next ?? 0
}

function setFields(
  db: SqliteLike,
  table: string,
  id: number,
  fields: Record<string, SqliteParam | undefined>
): void {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return
  const sets = entries.map(([k]) => `${k} = ?`).join(', ')
  const values = entries.map(([, v]) => v) as SqliteParam[]
  db.prepare(`UPDATE ${table} SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
    ...values,
    id
  )
}

function writePositions(db: SqliteLike, table: string, ids: number[]): void {
  const stmt = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`)
  ids.forEach((id, index) => stmt.run(index, id))
}

// ===================== CADERNOS =====================

export function listNotebooks(db: SqliteLike): Notebook[] {
  return db.prepare('SELECT * FROM notebooks ORDER BY position, id').all() as Notebook[]
}

export function getNotebook(db: SqliteLike, id: number): Notebook | undefined {
  return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook | undefined
}

/** Cria o caderno já com uma seção, para a tela nunca abrir um caderno sem onde escrever. */
export function createNotebook(db: SqliteLike, input: CreateNotebookInput): Notebook {
  const name = requireName(input.name, 'caderno')
  let id = 0
  db.transaction(() => {
    const position = nextPosition(db, 'SELECT MAX(position) + 1 AS next FROM notebooks')
    id = insertId(
      db
        .prepare('INSERT INTO notebooks (name, color, position) VALUES (?, ?, ?)')
        .run(name, input.color ?? DEFAULT_NOTEBOOK_COLOR, position)
    )
    db.prepare(
      'INSERT INTO notebook_sections (notebook_id, name, color, position) VALUES (?, ?, ?, 0)'
    ).run(id, DEFAULT_SECTION_NAME, DEFAULT_SECTION_COLOR)
  })()
  return getNotebook(db, id) as Notebook
}

export function updateNotebook(db: SqliteLike, id: number, input: UpdateNotebookInput): void {
  setFields(db, 'notebooks', id, {
    name: input.name === undefined ? undefined : requireName(input.name, 'caderno'),
    color: input.color
  })
}

function pageIdsWhere(db: SqliteLike, where: string, param: number): number[] {
  const rows = db
    .prepare(
      `SELECT p.id FROM notebook_pages p
       JOIN notebook_sections s ON s.id = p.section_id
       WHERE ${where}`
    )
    .all(param) as { id: number }[]
  return rows.map((r) => r.id)
}

/** Apaga o caderno e tudo abaixo. Devolve as páginas apagadas, para limpar os PNGs. */
export function deleteNotebook(db: SqliteLike, id: number): number[] {
  const pageIds = pageIdsWhere(db, 's.notebook_id = ?', id)
  db.prepare('DELETE FROM notebooks WHERE id = ?').run(id)
  return pageIds
}

export function reorderNotebooks(db: SqliteLike, ids: number[]): void {
  db.transaction(() => writePositions(db, 'notebooks', ids))()
}

// ===================== SEÇÕES =====================

export function listSections(db: SqliteLike, notebookId: number): NotebookSection[] {
  return db
    .prepare('SELECT * FROM notebook_sections WHERE notebook_id = ? ORDER BY position, id')
    .all(notebookId) as NotebookSection[]
}

export function getSection(db: SqliteLike, id: number): NotebookSection | undefined {
  return db.prepare('SELECT * FROM notebook_sections WHERE id = ?').get(id) as
    | NotebookSection
    | undefined
}

export function createSection(db: SqliteLike, input: CreateSectionInput): NotebookSection {
  const name = requireName(input.name, 'seção')
  if (!getNotebook(db, input.notebook_id)) throw new Error('Caderno não encontrado.')
  const position = nextPosition(
    db,
    'SELECT MAX(position) + 1 AS next FROM notebook_sections WHERE notebook_id = ?',
    input.notebook_id
  )
  const id = insertId(
    db
      .prepare(
        'INSERT INTO notebook_sections (notebook_id, name, color, position) VALUES (?, ?, ?, ?)'
      )
      .run(input.notebook_id, name, input.color ?? DEFAULT_SECTION_COLOR, position)
  )
  return getSection(db, id) as NotebookSection
}

export function updateSection(db: SqliteLike, id: number, input: UpdateSectionInput): void {
  setFields(db, 'notebook_sections', id, {
    name: input.name === undefined ? undefined : requireName(input.name, 'seção'),
    color: input.color
  })
}

export function deleteSection(db: SqliteLike, id: number): number[] {
  const pageIds = pageIdsWhere(db, 's.id = ?', id)
  db.prepare('DELETE FROM notebook_sections WHERE id = ?').run(id)
  return pageIds
}

export function reorderSections(db: SqliteLike, notebookId: number, ids: number[]): void {
  const owned = new Set(listSections(db, notebookId).map((s) => s.id))
  db.transaction(() =>
    writePositions(
      db,
      'notebook_sections',
      ids.filter((id) => owned.has(id))
    )
  )()
}

// ===================== PÁGINAS =====================

const PAGE_SUMMARY_COLUMNS =
  'id, section_id, parent_page_id, title, position, notion_page_id, created_at, updated_at'

export function listPages(db: SqliteLike, sectionId: number): NotebookPageSummary[] {
  return db
    .prepare(
      `SELECT ${PAGE_SUMMARY_COLUMNS} FROM notebook_pages WHERE section_id = ? ORDER BY position, id`
    )
    .all(sectionId) as NotebookPageSummary[]
}

export function getPage(db: SqliteLike, id: number): NotebookPage | undefined {
  return db
    .prepare(`SELECT ${PAGE_SUMMARY_COLUMNS}, notes, drawing FROM notebook_pages WHERE id = ?`)
    .get(id) as NotebookPage | undefined
}

function pageNodes(db: SqliteLike, sectionId: number): PageNode[] {
  return db
    .prepare('SELECT id, parent_page_id, position FROM notebook_pages WHERE section_id = ?')
    .all(sectionId) as PageNode[]
}

export function createPage(db: SqliteLike, input: CreatePageInput): NotebookPage {
  if (!getSection(db, input.section_id)) throw new Error('Seção não encontrada.')
  const parentId = input.parent_page_id ?? null
  if (parentId !== null) {
    const parent = getPage(db, parentId)
    if (!parent || parent.section_id !== input.section_id) {
      throw new Error('A página pai precisa estar na mesma seção.')
    }
    const nodes = [
      ...pageNodes(db, input.section_id),
      { id: -1, parent_page_id: null, position: 0 }
    ]
    if (!canPlaceUnder(nodes, -1, parentId)) {
      throw new Error('Subpáginas vão até 2 níveis.')
    }
  }
  const position = nextPosition(
    db,
    'SELECT MAX(position) + 1 AS next FROM notebook_pages WHERE section_id = ? AND parent_page_id IS ?',
    input.section_id,
    parentId
  )
  const id = insertId(
    db
      .prepare(
        'INSERT INTO notebook_pages (section_id, parent_page_id, title, position) VALUES (?, ?, ?, ?)'
      )
      .run(input.section_id, parentId, input.title?.trim() ?? '', position)
  )
  return getPage(db, id) as NotebookPage
}

export function updatePageTitle(db: SqliteLike, id: number, title: string): void {
  setFields(db, 'notebook_pages', id, { title: title.trim() })
}

export function updatePageNotes(db: SqliteLike, id: number, notes: string | null): void {
  setFields(db, 'notebook_pages', id, { notes, search_text: notesPlainText(notes) })
}

export function updatePageDrawing(db: SqliteLike, id: number, drawing: string | null): void {
  setFields(db, 'notebook_pages', id, { drawing })
}

/** Apaga a página e as subpáginas. Devolve os ids apagados, para limpar os PNGs. */
export function deletePage(db: SqliteLike, id: number): number[] {
  const page = getPage(db, id)
  if (!page) return []
  const ids = subtreeIds(pageNodes(db, page.section_id), id)
  db.transaction(() => {
    const stmt = db.prepare('DELETE FROM notebook_pages WHERE id = ?')
    for (const pageId of [...ids].reverse()) stmt.run(pageId)
  })()
  return ids
}

/** Move a página (com a subárvore) para `parent_page_id` na seção dada, na posição `index`. */
export function movePage(db: SqliteLike, id: number, input: MovePageInput): void {
  const page = getPage(db, id)
  if (!page) throw new Error('Página não encontrada.')
  if (!getSection(db, input.section_id)) throw new Error('Seção não encontrada.')

  const sourceNodes = pageNodes(db, page.section_id)
  const moved = subtreeIds(sourceNodes, id)
  const crossSection = input.section_id !== page.section_id
  const targetNodes = crossSection
    ? [...pageNodes(db, input.section_id), ...sourceNodes.filter((n) => moved.includes(n.id))]
    : sourceNodes

  if (input.parent_page_id !== null) {
    const parent = getPage(db, input.parent_page_id)
    if (!parent || parent.section_id !== input.section_id) {
      throw new Error('A página pai precisa estar na seção de destino.')
    }
  }
  if (!canPlaceUnder(targetNodes, id, input.parent_page_id)) {
    throw new Error('Esse movimento passaria do limite de 2 níveis de subpágina.')
  }

  const siblings = siblingsOf(targetNodes, input.parent_page_id)
    .map((n) => n.id)
    .filter((n) => n !== id)
  const index = Math.max(0, Math.min(input.index, siblings.length))
  siblings.splice(index, 0, id)

  db.transaction(() => {
    if (crossSection) {
      const stmt = db.prepare('UPDATE notebook_pages SET section_id = ? WHERE id = ?')
      for (const pageId of moved) stmt.run(input.section_id, pageId)
    }
    db.prepare(
      'UPDATE notebook_pages SET parent_page_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(input.parent_page_id, id)
    writePositions(db, 'notebook_pages', siblings)
  })()
}

// ===================== NOTION =====================

export type NotebookNodeKind = 'notebook' | 'section' | 'page'

const NODE_TABLE: Record<NotebookNodeKind, string> = {
  notebook: 'notebooks',
  section: 'notebook_sections',
  page: 'notebook_pages'
}

/** Grava o vínculo com o Notion sem mexer em updated_at: não é edição do usuário. */
export function setNotionPageId(
  db: SqliteLike,
  kind: NotebookNodeKind,
  id: number,
  notionPageId: string | null
): void {
  db.prepare(`UPDATE ${NODE_TABLE[kind]} SET notion_page_id = ? WHERE id = ?`).run(notionPageId, id)
}

export function getNotionPageId(db: SqliteLike, kind: NotebookNodeKind, id: number): string | null {
  const row = db.prepare(`SELECT notion_page_id FROM ${NODE_TABLE[kind]} WHERE id = ?`).get(id) as
    | { notion_page_id: string | null }
    | undefined
  return row?.notion_page_id ?? null
}

/** Ids da página e das subpáginas, pais antes dos filhos. */
export function listPageSubtree(db: SqliteLike, id: number): number[] {
  const page = getPage(db, id)
  if (!page) return []
  const nodes = pageNodes(db, page.section_id)
  const keep = new Set(subtreeIds(nodes, id))
  return flattenPageTree(nodes)
    .map((f) => f.page.id)
    .filter((pageId) => keep.has(pageId))
}

/** Todas as páginas do caderno, seção por seção, pais antes dos filhos. */
export function listNotebookPageIds(db: SqliteLike, notebookId: number): number[] {
  return listSections(db, notebookId).flatMap((section) =>
    flattenPageTree(pageNodes(db, section.id)).map((f) => f.page.id)
  )
}

// ===================== BUSCA =====================

const SEARCH_LIMIT = 30

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

/** Busca por título e texto. Título que bate vem antes; depois, a edição mais recente. */
export function searchPages(
  db: SqliteLike,
  query: string,
  limit = SEARCH_LIMIT
): PageSearchResult[] {
  const q = query.trim()
  if (!q) return []
  const like = likePattern(q)
  const rows = db
    .prepare(
      `SELECT p.id, p.title, p.section_id, s.name AS section_name, n.id AS notebook_id,
         n.name AS notebook_name, n.color AS notebook_color, p.search_text, p.updated_at
       FROM notebook_pages p
       JOIN notebook_sections s ON s.id = p.section_id
       JOIN notebooks n ON n.id = s.notebook_id
       WHERE p.title LIKE ? ESCAPE '\\' OR p.search_text LIKE ? ESCAPE '\\'
       ORDER BY (p.title LIKE ? ESCAPE '\\') DESC, p.updated_at DESC, p.id DESC
       LIMIT ?`
    )
    .all(like, like, like, limit) as (Omit<PageSearchResult, 'snippet'> & {
    search_text: string
  })[]
  return rows.map(({ search_text, ...row }) => ({
    ...row,
    snippet: searchSnippet(search_text, q)
  }))
}

export function locatePage(db: SqliteLike, id: number): PageLocation | null {
  const row = db
    .prepare(
      `SELECT p.id AS page_id, p.section_id, s.notebook_id
       FROM notebook_pages p JOIN notebook_sections s ON s.id = p.section_id
       WHERE p.id = ?`
    )
    .get(id) as PageLocation | undefined
  return row ?? null
}
