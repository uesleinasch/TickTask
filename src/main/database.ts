import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type {
  Task,
  TimeEntry,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
  WeeklyReview,
  ReviewHealthIndicators,
  TaskDependency,
  Area,
  CreateAreaInput,
  UpdateAreaInput,
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  TimeBlock,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  GtdMetrics,
  EnergyStats,
  EnergyLevel
} from '@shared/types'
import { DEFAULT_CONTEXTS } from '@shared/types'

const dbPath = path.join(app.getPath('userData'), 'ticktask.db')

let db: Database.Database

export function initDatabase(): void {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Criar tabela tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      total_seconds INTEGER DEFAULT 0,
      time_limit_seconds INTEGER,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'aguardando', 'proximas', 'executando', 'finalizada', 'someday')),
      category TEXT DEFAULT 'normal' CHECK(category IN ('urgente', 'prioridade', 'normal', 'time_leak')),
      is_running INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      project_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `)

  // Migração: adicionar coluna category se não existir
  try {
    db.exec(
      `ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'normal' CHECK(category IN ('urgente', 'prioridade', 'normal', 'time_leak'))`
    )
  } catch {
    // Coluna já existe
  }

  // Migração: adicionar coluna project_id se não existir
  try {
    db.exec(
      `ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`
    )
  } catch {
    // Coluna já existe
  }

  // Migração: atualizar CHECK constraint de status para incluir 'someday'
  // SQLite não suporta ALTER CHECK — é necessário recriar a tabela
  migrateTasksTableForSomedayStatus()

  // Criar tabela time_entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration_seconds INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // Índice para acelerar a busca de sessões em andamento (múltiplos timers)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_task_active
    ON time_entries(task_id, end_time)
  `)

  // Criar tabela tags
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Criar tabela de relacionamento task_tags
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  // ===================== FASE 1: Novas tabelas =====================

  // Criar tabela projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      outcome TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'someday', 'done', 'archived')),
      color TEXT DEFAULT '#6366f1',
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Criar tabela contexts
  db.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Criar tabela de relacionamento task_contexts
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_contexts (
      task_id INTEGER NOT NULL,
      context_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, context_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
    )
  `)

  // Criar tabela weekly_reviews
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      inbox_cleared INTEGER DEFAULT 0,
      notes TEXT,
      checklist_state TEXT DEFAULT '{}'
    )
  `)

  // Seed: inserir contextos padrão se a tabela estiver vazia
  const contextCount = db.prepare('SELECT COUNT(*) as count FROM contexts').get() as {
    count: number
  }
  if (contextCount.count === 0) {
    const insertCtx = db.prepare(
      'INSERT OR IGNORE INTO contexts (name, icon, color) VALUES (?, ?, ?)'
    )
    for (const ctx of DEFAULT_CONTEXTS) {
      insertCtx.run(ctx.name, ctx.icon, ctx.color)
    }
  }

  // ===================== FASE 2: Migrações adicionais =====================

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN scheduled_date DATE')
  } catch {
    /* já existe */
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN due_date DATETIME')
  } catch {
    /* já existe */
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT')
  } catch {
    /* já existe */
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER')
  } catch {
    /* já existe */
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN recurrence_source_id INTEGER')
  } catch {
    /* já existe */
  }
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN day_order INTEGER')
  } catch {
    /* já existe */
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      task_id INTEGER NOT NULL,
      depends_on_task_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, depends_on_task_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // ===================== FASE 4: Horizontes GTD =====================

  db.exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🎯',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      horizon INTEGER NOT NULL CHECK(horizon IN (3, 4, 5)),
      area_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )
  `)

  // Migração: adicionar area_id à tabela projects
  try {
    db.exec(
      'ALTER TABLE projects ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL'
    )
  } catch {
    /* já existe */
  }

  // Migração: adicionar color à tabela projects
  try {
    db.exec("ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#6366f1'")
  } catch {
    /* já existe */
  }

  // ===================== FASE 4.2: Energy Tracking =====================
  try {
    db.exec(
      "ALTER TABLE tasks ADD COLUMN energy_level TEXT CHECK(energy_level IN ('alto', 'medio', 'baixo'))"
    )
  } catch {
    /* já existe */
  }

  // ===================== FASE 5: Notas ricas (Editor.js) =====================
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN notes TEXT')
  } catch {
    /* já existe */
  }

  // ===================== FASE 4.3: Blocos de Tempo =====================

  db.exec(`
    CREATE TABLE IF NOT EXISTS time_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // ===================== Tiptap: imagens das notas =====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS note_assets (
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
    )
  `)
}

// ===================== MIGRAÇÃO: someday status =====================

/**
 * SQLite não permite alterar CHECK constraints com ALTER TABLE.
 * Esta migração verifica se o constraint antigo ainda existe e,
 * se sim, recria a tabela tasks com o novo constraint que inclui 'someday'.
 */
function migrateTasksTableForSomedayStatus(): void {
  // Verificar se a migração é necessária tentando inserir e remover um registro de teste
  try {
    const testStmt = db.prepare(
      "INSERT INTO tasks (name, status) VALUES ('__migration_test__', 'someday')"
    )
    const result = testStmt.run()
    // Se chegou aqui, o constraint já permite 'someday' — remover o registro de teste
    db.prepare('DELETE FROM tasks WHERE id = ?').run(result.lastInsertRowid)
    return
  } catch {
    // CHECK constraint falhou — precisa migrar
    console.log('[Migration] Recriando tabela tasks para incluir status "someday"...')
  }

  const migration = db.transaction(() => {
    // Desabilitar foreign keys temporariamente para permitir a migração
    db.pragma('foreign_keys = OFF')

    // 1. Criar tabela temporária com o novo schema
    db.exec(`
      CREATE TABLE tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        total_seconds INTEGER DEFAULT 0,
        time_limit_seconds INTEGER,
        status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'aguardando', 'proximas', 'executando', 'finalizada', 'someday')),
        category TEXT DEFAULT 'normal' CHECK(category IN ('urgente', 'prioridade', 'normal', 'time_leak')),
        is_running INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        project_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `)

    // 2. Copiar todos os dados. Usar COALESCE para colunas que podem não existir na tabela antiga.
    //    Verificar quais colunas existem na tabela original
    const columns = db.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
    const columnNames = columns.map((c) => c.name)

    const hasProjectId = columnNames.includes('project_id')
    const hasCategory = columnNames.includes('category')

    const selectCols = [
      'id',
      'name',
      'description',
      'total_seconds',
      'time_limit_seconds',
      'status',
      hasCategory ? 'category' : "'normal' as category",
      'is_running',
      'is_archived',
      hasProjectId ? 'project_id' : 'NULL as project_id',
      'created_at',
      'updated_at'
    ].join(', ')

    db.exec(`
      INSERT INTO tasks_new (id, name, description, total_seconds, time_limit_seconds, status, category, is_running, is_archived, project_id, created_at, updated_at)
      SELECT ${selectCols} FROM tasks
    `)

    // 3. Dropar tabela antiga e renomear
    db.exec('DROP TABLE tasks')
    db.exec('ALTER TABLE tasks_new RENAME TO tasks')

    // Reabilitar foreign keys
    db.pragma('foreign_keys = ON')
  })

  migration()
  console.log('[Migration] Tabela tasks migrada com sucesso.')
}

// ===================== TAGS =====================

export interface TagRow {
  id: number
  name: string
  color: string
  created_at: string
}

const TAG_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#3b82f6'
]

function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export function createTag(name: string, color?: string): TagRow {
  const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
  const result = stmt.run(name.trim(), color || getRandomTagColor())
  return getTag(result.lastInsertRowid as number)!
}

export function getTag(id: number): TagRow | undefined {
  const stmt = db.prepare('SELECT * FROM tags WHERE id = ?')
  return stmt.get(id) as TagRow | undefined
}

export function getTagByName(name: string): TagRow | undefined {
  const stmt = db.prepare('SELECT * FROM tags WHERE name = ?')
  return stmt.get(name.trim()) as TagRow | undefined
}

export function listTags(): TagRow[] {
  const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC')
  return stmt.all() as TagRow[]
}

export function deleteTag(id: number): void {
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?')
  stmt.run(id)
}

export function getOrCreateTag(name: string): TagRow {
  const existing = getTagByName(name)
  if (existing) return existing
  return createTag(name)
}

export function setTaskTags(taskId: number, tagIds: number[]): void {
  const transaction = db.transaction(() => {
    const deleteStmt = db.prepare('DELETE FROM task_tags WHERE task_id = ?')
    deleteStmt.run(taskId)

    if (tagIds.length > 0) {
      const insertStmt = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
      for (const tagId of tagIds) {
        insertStmt.run(taskId, tagId)
      }
    }
  })
  transaction()
}

export function getTaskTags(taskId: number): TagRow[] {
  const stmt = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN task_tags tt ON t.id = tt.tag_id
    WHERE tt.task_id = ?
    ORDER BY t.name ASC
  `)
  return stmt.all(taskId) as TagRow[]
}

// ===================== CONTEXTS =====================

export interface ContextRow {
  id: number
  name: string
  icon: string
  color: string
  created_at: string
}

export function createContext(name: string, icon?: string, color?: string): ContextRow {
  const stmt = db.prepare('INSERT INTO contexts (name, icon, color) VALUES (?, ?, ?)')
  const result = stmt.run(name.trim(), icon || '📋', color || '#6366f1')
  return getContext(result.lastInsertRowid as number)!
}

export function getContext(id: number): ContextRow | undefined {
  const stmt = db.prepare('SELECT * FROM contexts WHERE id = ?')
  return stmt.get(id) as ContextRow | undefined
}

export function listContexts(): ContextRow[] {
  const stmt = db.prepare('SELECT * FROM contexts ORDER BY name ASC')
  return stmt.all() as ContextRow[]
}

export function updateContext(
  id: number,
  data: { name?: string; icon?: string; color?: string }
): void {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name.trim())
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?')
    values.push(data.icon)
  }
  if (data.color !== undefined) {
    updates.push('color = ?')
    values.push(data.color)
  }

  if (updates.length > 0) {
    values.push(id)
    const stmt = db.prepare(`UPDATE contexts SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  }
}

export function deleteContext(id: number): void {
  const stmt = db.prepare('DELETE FROM contexts WHERE id = ?')
  stmt.run(id)
}

export function setTaskContexts(taskId: number, contextIds: number[]): void {
  const transaction = db.transaction(() => {
    const deleteStmt = db.prepare('DELETE FROM task_contexts WHERE task_id = ?')
    deleteStmt.run(taskId)

    if (contextIds.length > 0) {
      const insertStmt = db.prepare('INSERT INTO task_contexts (task_id, context_id) VALUES (?, ?)')
      for (const contextId of contextIds) {
        insertStmt.run(taskId, contextId)
      }
    }
  })
  transaction()
}

export function getTaskContexts(taskId: number): ContextRow[] {
  const stmt = db.prepare(`
    SELECT c.* FROM contexts c
    INNER JOIN task_contexts tc ON c.id = tc.context_id
    WHERE tc.task_id = ?
    ORDER BY c.name ASC
  `)
  return stmt.all(taskId) as ContextRow[]
}

// ===================== PROJECTS =====================

export function createProject(data: CreateProjectInput): Project {
  const stmt = db.prepare(`
    INSERT INTO projects (name, description, outcome, status, color, due_date, area_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    data.name,
    data.description || null,
    data.outcome || null,
    data.status || 'active',
    data.color || '#6366f1',
    data.due_date || null,
    data.area_id || null
  )
  return getProject(result.lastInsertRowid as number)!
}

export function getProject(id: number): Project | undefined {
  const stmt = db.prepare(`
    SELECT p.*, a.name as area_name FROM projects p
    LEFT JOIN areas a ON a.id = p.area_id
    WHERE p.id = ?
  `)
  const row = stmt.get(id) as Project | undefined
  if (!row) return undefined
  return enrichProject(row)
}

export function listProjects(status?: ProjectStatus): Project[] {
  if (status) {
    const stmt = db.prepare(`
      SELECT p.*, a.name as area_name FROM projects p
      LEFT JOIN areas a ON a.id = p.area_id
      WHERE p.status = ? ORDER BY p.updated_at DESC
    `)
    return (stmt.all(status) as Project[]).map(enrichProject)
  }
  const stmt = db.prepare(`
    SELECT p.*, a.name as area_name FROM projects p
    LEFT JOIN areas a ON a.id = p.area_id
    ORDER BY p.updated_at DESC
  `)
  return (stmt.all() as Project[]).map(enrichProject)
}

function enrichProject(project: Project): Project {
  const taskCountStmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?')
  const completedCountStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = 'finalizada'"
  )
  const nextActionStmt = db.prepare(
    "SELECT name FROM tasks WHERE project_id = ? AND status = 'proximas' ORDER BY updated_at DESC LIMIT 1"
  )

  const taskCount = (taskCountStmt.get(project.id) as { count: number }).count
  const completedCount = (completedCountStmt.get(project.id) as { count: number }).count
  const nextAction = nextActionStmt.get(project.id) as { name: string } | undefined

  return {
    ...project,
    task_count: taskCount,
    completed_task_count: completedCount,
    next_action: nextAction?.name
  }
}

export function updateProject(id: number, data: UpdateProjectInput): void {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description)
  }
  if (data.outcome !== undefined) {
    updates.push('outcome = ?')
    values.push(data.outcome)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
  }
  if (data.color !== undefined) {
    updates.push('color = ?')
    values.push(data.color)
  }
  if (data.due_date !== undefined) {
    updates.push('due_date = ?')
    values.push(data.due_date)
  }
  if (data.area_id !== undefined) {
    updates.push('area_id = ?')
    values.push(data.area_id)
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  }
}

export function deleteProject(id: number): void {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
  stmt.run(id)
}

export function getProjectTasks(projectId: number): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC')
  const rows = stmt.all(projectId) as Task[]
  return rows.map((row) => ({
    ...row,
    category: row.category || 'normal',
    is_running: Boolean(row.is_running),
    is_archived: Boolean(row.is_archived),
    tags: getTaskTags(row.id),
    contexts: getTaskContexts(row.id)
  }))
}

// ===================== TASKS =====================

export function createTask(data: CreateTaskInput): Task {
  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO tasks (name, description, time_limit_seconds, category, project_id,
                         scheduled_date, due_date, recurrence_rule, parent_task_id, recurrence_source_id,
                         energy_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      data.name,
      data.description || null,
      data.time_limit_seconds || null,
      data.category || 'normal',
      data.project_id || null,
      data.scheduled_date || null,
      data.due_date || null,
      data.recurrence_rule || null,
      data.parent_task_id || null,
      data.recurrence_source_id || null,
      data.energy_level || null
    )
    const taskId = result.lastInsertRowid as number

    // Processar tags
    const tagIds: number[] = []
    if (data.tagIds && data.tagIds.length > 0) {
      tagIds.push(...data.tagIds)
    }
    if (data.tagNames && data.tagNames.length > 0) {
      for (const name of data.tagNames) {
        const tag = getOrCreateTag(name)
        if (!tagIds.includes(tag.id)) {
          tagIds.push(tag.id)
        }
      }
    }
    if (tagIds.length > 0) {
      setTaskTags(taskId, tagIds)
    }

    // Processar contextos
    if (data.contextIds && data.contextIds.length > 0) {
      setTaskContexts(taskId, data.contextIds)
    }

    return taskId
  })

  const taskId = transaction()
  return getTask(taskId)!
}

function enrichTask(row: Task & { project_name?: string }): Task {
  const subtaskStats = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as completed
    FROM tasks WHERE parent_task_id = ? AND is_archived = 0
  `
    )
    .get(row.id) as { total: number; completed: number }

  const blockedRow = db
    .prepare(
      `
    SELECT COUNT(*) as cnt FROM task_dependencies d
    JOIN tasks dep ON dep.id = d.depends_on_task_id
    WHERE d.task_id = ? AND dep.status != 'finalizada'
  `
    )
    .get(row.id) as { cnt: number }

  return {
    ...row,
    category: row.category || 'normal',
    is_running: Boolean(row.is_running),
    is_archived: Boolean(row.is_archived),
    tags: getTaskTags(row.id),
    contexts: getTaskContexts(row.id),
    subtask_count: subtaskStats.total,
    completed_subtask_count: subtaskStats.completed,
    is_blocked: blockedRow.cnt > 0
  }
}

export function listTasks(archived: boolean = false): Task[] {
  const stmt = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.is_archived = ? AND t.parent_task_id IS NULL
    ORDER BY t.updated_at DESC
  `)
  const rows = stmt.all(archived ? 1 : 0) as (Task & { project_name?: string })[]
  return rows.map(enrichTask)
}

export function getTask(id: number): Task | undefined {
  const stmt = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `)
  const row = stmt.get(id) as (Task & { project_name?: string }) | undefined
  if (row) return enrichTask(row)
  return undefined
}

export function updateTask(id: number, data: UpdateTaskInput): void {
  const transaction = db.transaction(() => {
    const updates: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.time_limit_seconds !== undefined) {
      updates.push('time_limit_seconds = ?')
      values.push(data.time_limit_seconds)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      values.push(data.category)
    }
    if (data.project_id !== undefined) {
      updates.push('project_id = ?')
      values.push(data.project_id)
    }
    if (data.scheduled_date !== undefined) {
      updates.push('scheduled_date = ?')
      values.push(data.scheduled_date)
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?')
      values.push(data.due_date)
    }
    if (data.recurrence_rule !== undefined) {
      updates.push('recurrence_rule = ?')
      values.push(data.recurrence_rule)
    }
    if (data.day_order !== undefined) {
      updates.push('day_order = ?')
      values.push(data.day_order)
    }
    if (data.energy_level !== undefined) {
      updates.push('energy_level = ?')
      values.push(data.energy_level)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`)
      stmt.run(...values)
    }

    // Processar tags
    if (data.tagIds !== undefined || data.tagNames !== undefined) {
      const tagIds: number[] = []
      if (data.tagIds && data.tagIds.length > 0) {
        tagIds.push(...data.tagIds)
      }
      if (data.tagNames && data.tagNames.length > 0) {
        for (const name of data.tagNames) {
          const tag = getOrCreateTag(name)
          if (!tagIds.includes(tag.id)) {
            tagIds.push(tag.id)
          }
        }
      }
      setTaskTags(id, tagIds)
    }

    // Processar contextos
    if (data.contextIds !== undefined) {
      setTaskContexts(id, data.contextIds)
    }
  })

  transaction()
}

export function updateTaskNotes(id: number, notes: string | null): void {
  const stmt = db.prepare('UPDATE tasks SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
  stmt.run(notes, id)
}

export interface MentionResult {
  id: number
  label: string
  type: 'task' | 'project' | 'context'
}

// Busca entidades mencionáveis (tasks, projetos, contextos) para o "@" das notas.
export function searchMentions(query: string): MentionResult[] {
  const like = `%${query}%`
  const tasks = db
    .prepare(
      'SELECT id, name AS label FROM tasks WHERE is_archived = 0 AND name LIKE ? ORDER BY updated_at DESC LIMIT 5'
    )
    .all(like) as Array<{ id: number; label: string }>
  const projects = db
    .prepare('SELECT id, name AS label FROM projects WHERE name LIKE ? LIMIT 5')
    .all(like) as Array<{ id: number; label: string }>
  const contexts = db
    .prepare('SELECT id, name AS label FROM contexts WHERE name LIKE ? LIMIT 5')
    .all(like) as Array<{ id: number; label: string }>
  return [
    ...tasks.map((t) => ({ ...t, type: 'task' as const })),
    ...projects.map((p) => ({ ...p, type: 'project' as const })),
    ...contexts.map((c) => ({ ...c, type: 'context' as const }))
  ]
}

export interface NoteAsset {
  id: number
  task_id: number
  asset_id: string
  filename: string
  mime: string
  content_hash: string
  notion_file_upload_id: string | null
  notion_uploaded_at: number | null
}

export function createNoteAsset(a: {
  taskId: number
  assetId: string
  filename: string
  mime: string
  contentHash: string
  createdAt: number
}): void {
  db.prepare(
    `INSERT INTO note_assets (task_id, asset_id, filename, mime, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(a.taskId, a.assetId, a.filename, a.mime, a.contentHash, a.createdAt)
}

export function getNoteAsset(assetId: string): NoteAsset | undefined {
  return db.prepare('SELECT * FROM note_assets WHERE asset_id = ?').get(assetId) as
    | NoteAsset
    | undefined
}

export function setNoteAssetUpload(
  assetId: string,
  fileUploadId: string,
  uploadedAt: number
): void {
  db.prepare(
    'UPDATE note_assets SET notion_file_upload_id = ?, notion_uploaded_at = ? WHERE asset_id = ?'
  ).run(fileUploadId, uploadedAt, assetId)
}

export function clearNoteAssetUpload(assetId: string): void {
  db.prepare(
    'UPDATE note_assets SET notion_file_upload_id = NULL, notion_uploaded_at = NULL WHERE asset_id = ?'
  ).run(assetId)
}

// Ids das subtarefas (filhas) de uma tarefa — todas, inclusive arquivadas
export function getChildTaskIds(parentId: number): number[] {
  const stmt = db.prepare('SELECT id FROM tasks WHERE parent_task_id = ?')
  return (stmt.all(parentId) as { id: number }[]).map((r) => r.id)
}

export function deleteTask(id: number): void {
  const transaction = db.transaction(() => {
    // Excluir subtarefas junto com a tarefa pai
    db.prepare('DELETE FROM tasks WHERE parent_task_id = ?').run(id)
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  })
  transaction()
}

export function deleteTasks(ids: number[]): void {
  if (ids.length === 0) return

  const transaction = db.transaction((taskIds: number[]) => {
    const deleteChildren = db.prepare('DELETE FROM tasks WHERE parent_task_id = ?')
    const deleteTaskStmt = db.prepare('DELETE FROM tasks WHERE id = ?')
    for (const id of taskIds) {
      deleteChildren.run(id)
      deleteTaskStmt.run(id)
    }
  })

  transaction(ids)
}

export function archiveTask(id: number): void {
  const stmt = db.prepare(
    'UPDATE tasks SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function unarchiveTask(id: number): void {
  const stmt = db.prepare(
    'UPDATE tasks SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(id)
}

export function updateTaskStatus(id: number, status: TaskStatus): void {
  const stmt = db.prepare(
    'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(status, id)
}

export function updateTasksStatus(ids: number[], status: TaskStatus): void {
  if (ids.length === 0) return

  const transaction = db.transaction((taskIds: number[], nextStatus: TaskStatus) => {
    const stmt = db.prepare(
      'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    for (const id of taskIds) {
      stmt.run(nextStatus, id)
    }
  })

  transaction(ids, status)
}

export function moveTasksToProject(ids: number[], projectId: number | null): void {
  if (ids.length === 0) return

  const transaction = db.transaction((taskIds: number[], nextProjectId: number | null) => {
    const stmt = db.prepare(
      'UPDATE tasks SET project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    for (const id of taskIds) {
      stmt.run(nextProjectId, id)
    }
  })

  transaction(ids, projectId)
}

export function startTask(id: number): void {
  const transaction = db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET is_running = 1, status = 'executando', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    updateStmt.run(id)

    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO time_entries (task_id, start_time)
      VALUES (?, ?)
    `)
    insertStmt.run(id, now)
  })

  transaction()
}

export function stopTask(id: number): void {
  const transaction = db.transaction(() => {
    const selectStmt = db.prepare(`
      SELECT id, start_time FROM time_entries
      WHERE task_id = ? AND end_time IS NULL
      ORDER BY id DESC LIMIT 1
    `)
    const entry = selectStmt.get(id) as { id: number; start_time: string } | undefined

    if (entry) {
      const now = new Date()
      const startTime = new Date(entry.start_time)
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000))

      const updateEntryStmt = db.prepare(`
        UPDATE time_entries
        SET end_time = ?, duration_seconds = ?
        WHERE id = ?
      `)
      updateEntryStmt.run(now.toISOString(), durationSeconds, entry.id)

      const updateTaskStmt = db.prepare(`
        UPDATE tasks
        SET is_running = 0,
            total_seconds = total_seconds + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateTaskStmt.run(durationSeconds, id)
    } else {
      const updateTaskStmt = db.prepare(`
        UPDATE tasks
        SET is_running = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateTaskStmt.run(id)
    }
  })

  transaction()
}

export function updateTimer(id: number, totalSeconds: number): void {
  const stmt = db.prepare(
    'UPDATE tasks SET total_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  stmt.run(totalSeconds, id)
}

export function getTimeEntries(taskId: number): TimeEntry[] {
  const stmt = db.prepare(`
    SELECT * FROM time_entries
    WHERE task_id = ?
    ORDER BY start_time DESC
  `)
  return stmt.all(taskId) as TimeEntry[]
}

export function getActiveTimeEntry(taskId: number): TimeEntry | undefined {
  const stmt = db.prepare(`
    SELECT * FROM time_entries
    WHERE task_id = ? AND end_time IS NULL
    ORDER BY id DESC LIMIT 1
  `)
  return stmt.get(taskId) as TimeEntry | undefined
}

export function resetTaskTimer(id: number): void {
  const transaction = db.transaction(() => {
    const updateEntryStmt = db.prepare(`
      UPDATE time_entries
      SET end_time = datetime('now'), duration_seconds = 0
      WHERE task_id = ? AND end_time IS NULL
    `)
    updateEntryStmt.run(id)

    const updateTaskStmt = db.prepare(`
      UPDATE tasks
      SET total_seconds = 0, is_running = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    updateTaskStmt.run(id)

    const deleteStmt = db.prepare('DELETE FROM time_entries WHERE task_id = ?')
    deleteStmt.run(id)
  })

  transaction()
}

export function addManualTimeEntry(taskId: number, seconds: number): void {
  const transaction = db.transaction(() => {
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO time_entries (task_id, start_time, end_time, duration_seconds)
      VALUES (?, ?, ?, ?)
    `)
    insertStmt.run(taskId, now, now, seconds)

    const updateTaskStmt = db.prepare(`
      UPDATE tasks
      SET total_seconds = total_seconds + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    updateTaskStmt.run(seconds, taskId)
  })

  transaction()
}

export function setTaskTotalTime(taskId: number, totalSeconds: number): void {
  const stmt = db.prepare(`
    UPDATE tasks
    SET total_seconds = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  stmt.run(totalSeconds, taskId)
}

// ===================== WEEKLY REVIEWS =====================

export function createWeeklyReview(): WeeklyReview {
  const stmt = db.prepare("INSERT INTO weekly_reviews (started_at) VALUES (datetime('now'))")
  const result = stmt.run()
  return getWeeklyReview(result.lastInsertRowid as number)!
}

export function getWeeklyReview(id: number): WeeklyReview | undefined {
  const stmt = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?')
  const row = stmt.get(id) as WeeklyReview | undefined
  if (row) {
    return {
      ...row,
      inbox_cleared: Boolean(row.inbox_cleared)
    }
  }
  return undefined
}

export function listWeeklyReviews(): WeeklyReview[] {
  const stmt = db.prepare('SELECT * FROM weekly_reviews ORDER BY started_at DESC LIMIT 20')
  return (stmt.all() as WeeklyReview[]).map((row) => ({
    ...row,
    inbox_cleared: Boolean(row.inbox_cleared)
  }))
}

export function getLastWeeklyReview(): WeeklyReview | undefined {
  const stmt = db.prepare('SELECT * FROM weekly_reviews ORDER BY started_at DESC LIMIT 1')
  const row = stmt.get() as WeeklyReview | undefined
  if (row) {
    return {
      ...row,
      inbox_cleared: Boolean(row.inbox_cleared)
    }
  }
  return undefined
}

export function updateWeeklyReview(
  id: number,
  data: { inbox_cleared?: boolean; notes?: string; checklist_state?: string; completed_at?: string }
): void {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.inbox_cleared !== undefined) {
    updates.push('inbox_cleared = ?')
    values.push(data.inbox_cleared ? 1 : 0)
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?')
    values.push(data.notes)
  }
  if (data.checklist_state !== undefined) {
    updates.push('checklist_state = ?')
    values.push(data.checklist_state)
  }
  if (data.completed_at !== undefined) {
    updates.push('completed_at = ?')
    values.push(data.completed_at)
  }

  if (updates.length > 0) {
    values.push(id)
    const stmt = db.prepare(`UPDATE weekly_reviews SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  }
}

export function getReviewHealthIndicators(): ReviewHealthIndicators {
  const inboxCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'inbox' AND is_archived = 0")
      .get() as { count: number }
  ).count

  const projectsWithoutNextAction = (
    db
      .prepare(
        `
      SELECT COUNT(*) as count FROM projects p
      WHERE p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.status = 'proximas'
      )
    `
      )
      .get() as { count: number }
  ).count

  const staleWaitingTasks = (
    db
      .prepare(
        `
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'aguardando'
      AND is_archived = 0
      AND updated_at <= datetime('now', '-7 days')
    `
      )
      .get() as { count: number }
  ).count

  const staleNextTasks = (
    db
      .prepare(
        `
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'proximas'
      AND is_archived = 0
      AND updated_at <= datetime('now', '-14 days')
    `
      )
      .get() as { count: number }
  ).count

  const somedayCount = (
    db
      .prepare(
        `
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'someday' AND is_archived = 0
    `
      )
      .get() as { count: number }
  ).count

  return {
    inboxCount,
    projectsWithoutNextAction,
    staleWaitingTasks,
    staleNextTasks,
    somedayCount
  }
}

// ===================== ESTATÍSTICAS =====================

export interface DailyStats {
  date: string
  dayOfWeek: number
  totalSeconds: number
}

export interface TaskTimeStats {
  taskId: number
  taskName: string
  totalSeconds: number
}

export interface StatusStats {
  status: string
  totalSeconds: number
}

export interface CategoryStats {
  category: string
  totalSeconds: number
  taskCount: number
}

export interface HeatmapData {
  date: string
  count: number
}

export function getWeeklyStats(): DailyStats[] {
  const stmt = db.prepare(`
    SELECT
      date(start_time) as date,
      strftime('%w', start_time) as dayOfWeek,
      SUM(COALESCE(duration_seconds, 0)) as totalSeconds
    FROM time_entries
    WHERE start_time >= date('now', '-30 days')
      AND end_time IS NOT NULL
    GROUP BY date(start_time)
    ORDER BY date(start_time)
  `)
  return stmt.all() as DailyStats[]
}

export function getTaskTimeStats(): TaskTimeStats[] {
  const stmt = db.prepare(`
    SELECT
      t.id as taskId,
      t.name as taskName,
      t.total_seconds as totalSeconds
    FROM tasks t
    WHERE t.total_seconds > 0
    ORDER BY t.total_seconds DESC
    LIMIT 10
  `)
  return stmt.all() as TaskTimeStats[]
}

export function getCategoryStats(): CategoryStats[] {
  const stmt = db.prepare(`
    SELECT
      COALESCE(category, 'normal') as category,
      SUM(total_seconds) as totalSeconds,
      COUNT(*) as taskCount
    FROM tasks
    WHERE total_seconds > 0
    GROUP BY category
  `)
  return stmt.all() as CategoryStats[]
}

export function getStatusStats(): StatusStats[] {
  const stmt = db.prepare(`
    SELECT
      status,
      SUM(total_seconds) as totalSeconds
    FROM tasks
    WHERE total_seconds > 0
    GROUP BY status
  `)
  return stmt.all() as StatusStats[]
}

export function getHeatmapData(): HeatmapData[] {
  const stmt = db.prepare(`
    SELECT
      date(start_time) as date,
      SUM(COALESCE(duration_seconds, 0)) as count
    FROM time_entries
    WHERE start_time >= date('now', '-365 days')
      AND end_time IS NOT NULL
    GROUP BY date(start_time)
    ORDER BY date(start_time)
  `)
  return stmt.all() as HeatmapData[]
}

export interface GeneralStats {
  totalTasks: number
  completedTasks: number
  totalTimeSeconds: number
  totalSessions: number
  avgSessionSeconds: number
}

export function getGeneralStats(): GeneralStats {
  const tasksStmt = db.prepare(`
    SELECT
      COUNT(*) as totalTasks,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as completedTasks,
      SUM(total_seconds) as totalTimeSeconds
    FROM tasks
  `)
  const tasksResult = tasksStmt.get() as {
    totalTasks: number
    completedTasks: number
    totalTimeSeconds: number
  }

  const sessionsStmt = db.prepare(`
    SELECT
      COUNT(*) as totalSessions,
      AVG(duration_seconds) as avgSessionSeconds
    FROM time_entries
    WHERE end_time IS NOT NULL
  `)
  const sessionsResult = sessionsStmt.get() as { totalSessions: number; avgSessionSeconds: number }

  return {
    totalTasks: tasksResult.totalTasks || 0,
    completedTasks: tasksResult.completedTasks || 0,
    totalTimeSeconds: tasksResult.totalTimeSeconds || 0,
    totalSessions: sessionsResult.totalSessions || 0,
    avgSessionSeconds: Math.round(sessionsResult.avgSessionSeconds || 0)
  }
}

// ===================== FASE 4.2: MÉTRICAS GTD AVANÇADAS =====================

export function getGtdMetrics(): GtdMetrics {
  // Taxa de conclusão do inbox (tarefas criadas esta semana que saíram do inbox)
  const inboxRow = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status != 'inbox' THEN 1 ELSE 0 END) as processed
    FROM tasks
    WHERE created_at >= datetime('now', '-7 days')
    AND is_archived = 0
    AND parent_task_id IS NULL
  `
    )
    .get() as { total: number; processed: number }

  const inboxCompletionRate =
    inboxRow.total > 0 ? Math.round((inboxRow.processed / inboxRow.total) * 100) : 100

  // Tempo médio de processamento (criação até finalização)
  const avgRow = db
    .prepare(
      `
    SELECT AVG((julianday(updated_at) - julianday(created_at)) * 86400) as avgSeconds
    FROM tasks
    WHERE status = 'finalizada'
    AND is_archived = 0
    AND updated_at >= datetime('now', '-30 days')
  `
    )
    .get() as { avgSeconds: number | null }

  const avgProcessingTimeSeconds = Math.round(avgRow.avgSeconds || 0)

  // Projetos sem atividade há mais de 7 dias
  const staleProjectRows = db
    .prepare(
      `
    SELECT p.id, p.name,
      CAST(julianday('now') - julianday(
        COALESCE(MAX(t.updated_at), p.created_at)
      ) AS INTEGER) as daysSinceActivity
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id AND t.is_archived = 0
    WHERE p.status = 'active'
    GROUP BY p.id
    HAVING daysSinceActivity > 7
    ORDER BY daysSinceActivity DESC
    LIMIT 5
  `
    )
    .all() as Array<{ id: number; name: string; daysSinceActivity: number }>

  // Tarefas em aguardando há mais de 14 dias
  const staleWaitingRows = db
    .prepare(
      `
    SELECT id, name,
      CAST(julianday('now') - julianday(updated_at) AS INTEGER) as daysSinceUpdate
    FROM tasks
    WHERE status = 'aguardando'
    AND is_archived = 0
    AND updated_at <= datetime('now', '-14 days')
    ORDER BY updated_at ASC
    LIMIT 5
  `
    )
    .all() as Array<{ id: number; name: string; daysSinceUpdate: number }>

  // Fluxo de tarefas por status
  const flowRows = db
    .prepare(
      `
    SELECT status, COUNT(*) as count
    FROM tasks
    WHERE is_archived = 0 AND parent_task_id IS NULL
    GROUP BY status
  `
    )
    .all() as Array<{ status: string; count: number }>

  const taskFlowCounts: Record<string, number> = {}
  for (const row of flowRows) {
    taskFlowCounts[row.status] = row.count
  }

  return {
    inboxCompletionRate,
    avgProcessingTimeSeconds,
    staleProjects: staleProjectRows,
    staleWaitingTasks: staleWaitingRows,
    taskFlowCounts
  }
}

export function getEnergyStats(): EnergyStats[] {
  const rows = db
    .prepare(
      `
    SELECT
      energy_level,
      SUM(total_seconds) as totalSeconds,
      COUNT(*) as taskCount,
      AVG(total_seconds) as avgSeconds
    FROM tasks
    WHERE energy_level IS NOT NULL
    AND is_archived = 0
    AND total_seconds > 0
    GROUP BY energy_level
    ORDER BY totalSeconds DESC
  `
    )
    .all() as Array<{
    energy_level: EnergyLevel
    totalSeconds: number
    taskCount: number
    avgSeconds: number
  }>

  return rows.map((r) => ({
    energy_level: r.energy_level,
    totalSeconds: r.totalSeconds || 0,
    taskCount: r.taskCount || 0,
    avgSeconds: Math.round(r.avgSeconds || 0)
  }))
}

// ===================== FASE 2: SUBTAREFAS =====================

export function getSubtasks(parentId: number): Task[] {
  const stmt = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.parent_task_id = ? AND t.is_archived = 0
    ORDER BY t.created_at ASC
  `)
  const rows = stmt.all(parentId) as (Task & { project_name?: string })[]
  return rows.map((row) => ({
    ...row,
    category: row.category || 'normal',
    is_running: Boolean(row.is_running),
    is_archived: Boolean(row.is_archived),
    subtask_count: 0,
    completed_subtask_count: 0,
    is_blocked: false
  }))
}

export function completeSubtasksCheck(parentId: number): void {
  const stats = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as completed
    FROM tasks WHERE parent_task_id = ? AND is_archived = 0
  `
    )
    .get(parentId) as { total: number; completed: number }

  if (stats.total > 0 && stats.total === stats.completed) {
    db.prepare(
      "UPDATE tasks SET status = 'finalizada', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(parentId)
  }
}

// ===================== FASE 2: DEPENDÊNCIAS =====================

export function getTaskDependencies(taskId: number): TaskDependency[] {
  const stmt = db.prepare(`
    SELECT d.task_id, d.depends_on_task_id, t.name as depends_on_task_name
    FROM task_dependencies d
    JOIN tasks t ON t.id = d.depends_on_task_id
    WHERE d.task_id = ?
  `)
  return stmt.all(taskId) as TaskDependency[]
}

export function getTaskDependents(taskId: number): number[] {
  const stmt = db.prepare(`
    SELECT task_id FROM task_dependencies WHERE depends_on_task_id = ?
  `)
  return (stmt.all(taskId) as { task_id: number }[]).map((r) => r.task_id)
}

export function addTaskDependency(taskId: number, dependsOnId: number): void {
  db.prepare(
    'INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)'
  ).run(taskId, dependsOnId)
}

export function removeTaskDependency(taskId: number, dependsOnId: number): void {
  db.prepare('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?').run(
    taskId,
    dependsOnId
  )
}

// ===================== FASE 2: AGENDAMENTO =====================

export function getTasksForDate(date: string): Task[] {
  const stmt = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.scheduled_date = ? AND t.is_archived = 0 AND t.parent_task_id IS NULL
    ORDER BY COALESCE(t.day_order, 999999), t.created_at ASC
  `)
  const rows = stmt.all(date) as (Task & { project_name?: string })[]
  return rows.map(enrichTask)
}

export function getWeeklySchedule(startDate: string): { date: string; tasks: Task[] }[] {
  const result: { date: string; tasks: Task[] }[] = []
  const start = new Date(startDate)

  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, tasks: getTasksForDate(dateStr) })
  }

  return result
}

export function updateDayOrder(taskId: number, order: number): void {
  db.prepare('UPDATE tasks SET day_order = ? WHERE id = ?').run(order, taskId)
}

// ===================== FASE 2: RECORRÊNCIA =====================

function calculateNextDate(
  rule: { type: string; dayOfWeek?: number; dayOfMonth?: number },
  fromDate?: string
): string {
  const base = fromDate ? new Date(fromDate + 'T12:00:00') : new Date()
  const next = new Date(base)

  switch (rule.type) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
  }

  return next.toISOString().split('T')[0]
}

export function createNextRecurrence(sourceTaskId: number): Task | null {
  const source = getTask(sourceTaskId)
  if (!source || !source.recurrence_rule) return null

  let rule: { type: string; dayOfWeek?: number; dayOfMonth?: number }
  try {
    rule = JSON.parse(source.recurrence_rule)
  } catch {
    return null
  }

  const nextDate = calculateNextDate(rule, source.scheduled_date)
  const tags = getTaskTags(sourceTaskId)
  const ctxs = getTaskContexts(sourceTaskId)

  return createTask({
    name: source.name,
    description: source.description,
    time_limit_seconds: source.time_limit_seconds,
    category: source.category,
    project_id: source.project_id || undefined,
    scheduled_date: nextDate,
    recurrence_rule: source.recurrence_rule,
    recurrence_source_id: sourceTaskId,
    tagIds: tags.map((t) => t.id),
    contextIds: ctxs.map((c) => c.id)
  })
}

export function deleteNextRecurrence(sourceTaskId: number): void {
  db.prepare("DELETE FROM tasks WHERE recurrence_source_id = ? AND status != 'finalizada'").run(
    sourceTaskId
  )
}

// ===================== FASE 2: PRAZO / NOTIFICAÇÕES =====================

export function getTasksDueForNotification(): Task[] {
  const stmt = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.due_date IS NOT NULL
      AND t.status != 'finalizada'
      AND t.is_archived = 0
      AND t.parent_task_id IS NULL
  `)
  const rows = stmt.all() as (Task & { project_name?: string })[]
  return rows.map(enrichTask)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}

// ===================== FASE 4: ÁREAS DE FOCO =====================

export function createArea(data: CreateAreaInput): Area {
  const stmt = db.prepare('INSERT INTO areas (name, description, icon) VALUES (?, ?, ?)')
  const result = stmt.run(data.name.trim(), data.description || null, data.icon || '🎯')
  return getArea(result.lastInsertRowid as number)!
}

export function getArea(id: number): Area | undefined {
  const stmt = db.prepare(`
    SELECT a.*, COUNT(p.id) as project_count
    FROM areas a
    LEFT JOIN projects p ON p.area_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `)
  return stmt.get(id) as Area | undefined
}

export function listAreas(): Area[] {
  const stmt = db.prepare(`
    SELECT a.*, COUNT(p.id) as project_count
    FROM areas a
    LEFT JOIN projects p ON p.area_id = a.id
    GROUP BY a.id
    ORDER BY a.name ASC
  `)
  return stmt.all() as Area[]
}

export function updateArea(id: number, data: UpdateAreaInput): void {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name.trim())
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description || null)
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?')
    values.push(data.icon)
  }

  if (updates.length === 0) return
  values.push(id)
  db.prepare(`UPDATE areas SET ${updates.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteArea(id: number): void {
  db.prepare('DELETE FROM areas WHERE id = ?').run(id)
}

// ===================== FASE 4: OBJETIVOS (GOALS) =====================

export function createGoal(data: CreateGoalInput): Goal {
  const stmt = db.prepare(
    'INSERT INTO goals (name, description, horizon, area_id) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(
    data.name.trim(),
    data.description || null,
    data.horizon,
    data.area_id || null
  )
  return getGoal(result.lastInsertRowid as number)!
}

export function getGoal(id: number): Goal | undefined {
  const stmt = db.prepare(`
    SELECT g.*, a.name as area_name
    FROM goals g
    LEFT JOIN areas a ON a.id = g.area_id
    WHERE g.id = ?
  `)
  return stmt.get(id) as Goal | undefined
}

export function listGoals(areaId?: number): Goal[] {
  if (areaId !== undefined) {
    const stmt = db.prepare(`
      SELECT g.*, a.name as area_name
      FROM goals g
      LEFT JOIN areas a ON a.id = g.area_id
      WHERE g.area_id = ?
      ORDER BY g.horizon ASC, g.name ASC
    `)
    return stmt.all(areaId) as Goal[]
  }
  const stmt = db.prepare(`
    SELECT g.*, a.name as area_name
    FROM goals g
    LEFT JOIN areas a ON a.id = g.area_id
    ORDER BY g.horizon ASC, g.name ASC
  `)
  return stmt.all() as Goal[]
}

export function updateGoal(id: number, data: UpdateGoalInput): void {
  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const values: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name.trim())
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description || null)
  }
  if (data.horizon !== undefined) {
    updates.push('horizon = ?')
    values.push(data.horizon)
  }
  if (data.area_id !== undefined) {
    updates.push('area_id = ?')
    values.push(data.area_id)
  }

  values.push(id)
  db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteGoal(id: number): void {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

// ===================== FASE 4.3: BLOCOS DE TEMPO =====================

export function createTimeBlock(data: CreateTimeBlockInput): TimeBlock {
  const stmt = db.prepare(
    'INSERT INTO time_blocks (task_id, date, start_time, end_time) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(data.task_id, data.date, data.start_time, data.end_time)
  return getTimeBlock(result.lastInsertRowid as number)!
}

export function getTimeBlock(id: number): TimeBlock | undefined {
  const stmt = db.prepare(`
    SELECT tb.*, t.name as task_name, t.category as task_category
    FROM time_blocks tb
    JOIN tasks t ON t.id = tb.task_id
    WHERE tb.id = ?
  `)
  return stmt.get(id) as TimeBlock | undefined
}

export function getTimeBlocksForDate(date: string): TimeBlock[] {
  const stmt = db.prepare(`
    SELECT tb.*, t.name as task_name, t.category as task_category
    FROM time_blocks tb
    JOIN tasks t ON t.id = tb.task_id
    WHERE tb.date = ?
    ORDER BY tb.start_time ASC
  `)
  return stmt.all(date) as TimeBlock[]
}

export function getTimeBlocksForWeek(startDate: string): TimeBlock[] {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const endDate = end.toISOString().split('T')[0]

  const stmt = db.prepare(`
    SELECT tb.*, t.name as task_name, t.category as task_category
    FROM time_blocks tb
    JOIN tasks t ON t.id = tb.task_id
    WHERE tb.date >= ? AND tb.date <= ?
    ORDER BY tb.date ASC, tb.start_time ASC
  `)
  return stmt.all(startDate, endDate) as TimeBlock[]
}

export function getTimeBlocksForMonth(yearMonth: string): TimeBlock[] {
  // yearMonth: 'YYYY-MM'
  const stmt = db.prepare(`
    SELECT tb.*, t.name as task_name, t.category as task_category
    FROM time_blocks tb
    JOIN tasks t ON t.id = tb.task_id
    WHERE strftime('%Y-%m', tb.date) = ?
    ORDER BY tb.date ASC, tb.start_time ASC
  `)
  return stmt.all(yearMonth) as TimeBlock[]
}

export function updateTimeBlock(id: number, data: UpdateTimeBlockInput): void {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.task_id !== undefined) {
    updates.push('task_id = ?')
    values.push(data.task_id)
  }
  if (data.date !== undefined) {
    updates.push('date = ?')
    values.push(data.date)
  }
  if (data.start_time !== undefined) {
    updates.push('start_time = ?')
    values.push(data.start_time)
  }
  if (data.end_time !== undefined) {
    updates.push('end_time = ?')
    values.push(data.end_time)
  }

  if (updates.length === 0) return
  values.push(id)
  db.prepare(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteTimeBlock(id: number): void {
  db.prepare('DELETE FROM time_blocks WHERE id = ?').run(id)
}
