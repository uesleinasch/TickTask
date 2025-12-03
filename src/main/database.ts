import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Task, TimeEntry, CreateTaskInput, UpdateTaskInput, TaskStatus } from '@shared/types'

const dbPath = path.join(app.getPath('userData'), 'ticktask.db')

let db: Database.Database

export function initDatabase(): void {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Criar tabela tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      total_seconds INTEGER DEFAULT 0,
      time_limit_seconds INTEGER,
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'aguardando', 'proximas', 'executando', 'finalizada')),
      category TEXT DEFAULT 'normal' CHECK(category IN ('urgente', 'prioridade', 'normal', 'time_leak')),
      is_running INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migração: adicionar coluna category se não existir
  try {
    db.exec(
      `ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'normal' CHECK(category IN ('urgente', 'prioridade', 'normal', 'time_leak'))`
    )
  } catch {
    // Coluna já existe, ignorar
  }

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
}

export function createTask(data: CreateTaskInput): Task {
  const stmt = db.prepare(`
    INSERT INTO tasks (name, description, time_limit_seconds, category)
    VALUES (?, ?, ?, ?)
  `)
  const result = stmt.run(
    data.name,
    data.description || null,
    data.time_limit_seconds || null,
    data.category || 'normal'
  )
  return getTask(result.lastInsertRowid as number)!
}

export function listTasks(archived: boolean = false): Task[] {
  const stmt = db.prepare(`
    SELECT * FROM tasks WHERE is_archived = ? ORDER BY updated_at DESC
  `)
  const rows = stmt.all(archived ? 1 : 0) as Task[]
  return rows.map((row) => ({
    ...row,
    category: row.category || 'normal',
    is_running: Boolean(row.is_running),
    is_archived: Boolean(row.is_archived)
  }))
}

export function getTask(id: number): Task | undefined {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  const row = stmt.get(id) as Task | undefined
  if (row) {
    return {
      ...row,
      category: row.category || 'normal',
      is_running: Boolean(row.is_running),
      is_archived: Boolean(row.is_archived)
    }
  }
  return undefined
}

export function updateTask(id: number, data: UpdateTaskInput): void {
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

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  }
}

export function deleteTask(id: number): void {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  stmt.run(id)
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

export function startTask(id: number): void {
  const transaction = db.transaction(() => {
    // Atualizar is_running e status para executando
    const updateStmt = db.prepare(`
      UPDATE tasks 
      SET is_running = 1, status = 'executando', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    updateStmt.run(id)

    // Criar novo time_entry com timestamp ISO
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
    // Encontrar time_entry ativo
    const selectStmt = db.prepare(`
      SELECT id, start_time FROM time_entries 
      WHERE task_id = ? AND end_time IS NULL 
      ORDER BY id DESC LIMIT 1
    `)
    const entry = selectStmt.get(id) as { id: number; start_time: string } | undefined

    if (entry) {
      // Calcular duração usando timestamps
      const now = new Date()
      const startTime = new Date(entry.start_time)
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000))

      // Atualizar time_entry
      const updateEntryStmt = db.prepare(`
        UPDATE time_entries 
        SET end_time = ?, duration_seconds = ?
        WHERE id = ?
      `)
      updateEntryStmt.run(now.toISOString(), durationSeconds, entry.id)

      // Atualizar total_seconds da tarefa
      const updateTaskStmt = db.prepare(`
        UPDATE tasks 
        SET is_running = 0, 
            total_seconds = total_seconds + ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)
      updateTaskStmt.run(durationSeconds, id)
    } else {
      // Apenas parar se não encontrar entry
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
    // Parar qualquer timer ativo
    const updateEntryStmt = db.prepare(`
      UPDATE time_entries 
      SET end_time = datetime('now'), duration_seconds = 0
      WHERE task_id = ? AND end_time IS NULL
    `)
    updateEntryStmt.run(id)

    // Resetar total_seconds
    const updateTaskStmt = db.prepare(`
      UPDATE tasks 
      SET total_seconds = 0, is_running = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    updateTaskStmt.run(id)

    // Deletar todos os time entries
    const deleteStmt = db.prepare('DELETE FROM time_entries WHERE task_id = ?')
    deleteStmt.run(id)
  })

  transaction()
}

export function addManualTimeEntry(taskId: number, seconds: number): void {
  const transaction = db.transaction(() => {
    const now = new Date().toISOString()

    // Criar uma entrada de tempo manual (start_time e end_time iguais, duração manual)
    const insertStmt = db.prepare(`
      INSERT INTO time_entries (task_id, start_time, end_time, duration_seconds)
      VALUES (?, ?, ?, ?)
    `)
    insertStmt.run(taskId, now, now, seconds)

    // Atualizar total_seconds da tarefa
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

// Estatísticas por dia da semana (últimos 30 dias)
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

// Tempo por tarefa (top 10)
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

// Tempo por categoria
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

// Tempo por status
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

// Heatmap - últimos 365 dias
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

// Estatísticas gerais
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

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}
