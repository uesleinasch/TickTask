export type TaskStatus = 'inbox' | 'aguardando' | 'proximas' | 'executando' | 'finalizada'

export interface Task {
  id: number
  name: string
  description?: string
  total_seconds: number
  time_limit_seconds?: number
  status: TaskStatus
  is_running: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
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
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  time_limit_seconds?: number
  status?: TaskStatus
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
