// ===================== STATUS & CATEGORY =====================

export type TaskStatus = 'inbox' | 'aguardando' | 'proximas' | 'executando' | 'finalizada' | 'someday'
export type TaskCategory = 'urgente' | 'prioridade' | 'normal' | 'time_leak'
export type ProjectStatus = 'active' | 'someday' | 'done' | 'archived'

// ===================== TAG =====================

export interface Tag {
  id: number
  name: string
  color: string
  created_at: string
}

// ===================== CONTEXT =====================

export interface Context {
  id: number
  name: string
  icon: string
  color: string
  created_at: string
}

// ===================== PROJECT =====================

export interface Project {
  id: number
  name: string
  description?: string
  outcome?: string
  status: ProjectStatus
  due_date?: string
  created_at: string
  updated_at: string
  task_count?: number
  completed_task_count?: number
  next_action?: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  outcome?: string
  status?: ProjectStatus
  due_date?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  outcome?: string
  status?: ProjectStatus
  due_date?: string
}

// ===================== TASK =====================

export interface Task {
  id: number
  name: string
  description?: string
  total_seconds: number
  time_limit_seconds?: number
  status: TaskStatus
  category: TaskCategory
  is_running: boolean
  is_archived: boolean
  project_id?: number
  project_name?: string
  created_at: string
  updated_at: string
  tags?: Tag[]
  contexts?: Context[]
}

export interface CreateTaskInput {
  name: string
  description?: string
  time_limit_seconds?: number
  category?: TaskCategory
  tagIds?: number[]
  tagNames?: string[]
  project_id?: number
  contextIds?: number[]
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  time_limit_seconds?: number
  status?: TaskStatus
  category?: TaskCategory
  tagIds?: number[]
  tagNames?: string[]
  project_id?: number | null
  contextIds?: number[]
}

export interface TimeEntry {
  id: number
  task_id: number
  start_time: string
  end_time: string | null
  duration_seconds: number | null
}

// ===================== WEEKLY REVIEW =====================

export interface WeeklyReview {
  id: number
  started_at: string
  completed_at?: string
  inbox_cleared: boolean
  notes?: string
  checklist_state: string
}

export interface ReviewHealthIndicators {
  inboxCount: number
  projectsWithoutNextAction: number
  staleWaitingTasks: number
  staleNextTasks: number
  somedayCount: number
}

// ===================== LABELS & COLORS =====================

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada',
  someday: 'Someday/Maybe'
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox: 'bg-gray-500',
  aguardando: 'bg-yellow-500',
  proximas: 'bg-blue-500',
  executando: 'bg-green-500',
  finalizada: 'bg-purple-500',
  someday: 'bg-teal-500'
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  urgente: 'Urgente',
  prioridade: 'Prioridade',
  normal: 'Normal',
  time_leak: 'Time Leak'
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  urgente: 'bg-red-500',
  prioridade: 'bg-orange-500',
  normal: 'bg-blue-500',
  time_leak: 'bg-yellow-500'
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Ativo',
  someday: 'Someday',
  done: 'Concluído',
  archived: 'Arquivado'
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-emerald-500',
  someday: 'bg-teal-500',
  done: 'bg-purple-500',
  archived: 'bg-gray-500'
}

// ===================== DEFAULT CONTEXTS =====================

export const DEFAULT_CONTEXTS = [
  { name: '@computador', icon: '💻', color: '#3b82f6' },
  { name: '@telefone', icon: '📱', color: '#8b5cf6' },
  { name: '@reunião', icon: '👥', color: '#f97316' },
  { name: '@email', icon: '📧', color: '#ef4444' },
  { name: '@leitura', icon: '📖', color: '#22c55e' },
  { name: '@compras', icon: '🛒', color: '#eab308' },
  { name: '@casa', icon: '🏠', color: '#14b8a6' },
  { name: '@escritório', icon: '🏢', color: '#6366f1' }
]
