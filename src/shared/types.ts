export type TaskStatus = 'inbox' | 'aguardando' | 'proximas' | 'executando' | 'finalizada'
export type TaskCategory = 'urgente' | 'prioridade' | 'normal' | 'time_leak'

export interface Tag {
  id: number
  name: string
  color: string
  created_at: string
}

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
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface TimeEntry {
  id: number
  task_id: number
  start_time: string
  end_time: string | null
  duration_seconds: number | null
}

export interface CreateTaskInput {
  name: string
  description?: string
  time_limit_seconds?: number
  category?: TaskCategory
  tagIds?: number[]
  tagNames?: string[] // Para criar novas tags automaticamente
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  time_limit_seconds?: number
  status?: TaskStatus
  category?: TaskCategory
  tagIds?: number[]
  tagNames?: string[]
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada'
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox: 'bg-gray-500',
  aguardando: 'bg-yellow-500',
  proximas: 'bg-blue-500',
  executando: 'bg-green-500',
  finalizada: 'bg-purple-500'
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
