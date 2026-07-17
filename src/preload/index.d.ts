import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Task,
  TimeEntry,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Tag,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
  Context,
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
  EnergyStats
} from '../shared/types'

interface FloatTimerData {
  taskId: number
  taskName: string
  seconds: number
}

interface DailyStats {
  date: string
  dayOfWeek: number
  totalSeconds: number
}

interface TaskTimeStats {
  taskId: number
  taskName: string
  totalSeconds: number
}

interface StatusStats {
  status: string
  totalSeconds: number
}

interface CategoryStats {
  category: string
  totalSeconds: number
  taskCount: number
}

interface HeatmapData {
  date: string
  count: number
}

interface GeneralStats {
  totalTasks: number
  completedTasks: number
  totalTimeSeconds: number
  totalSessions: number
  avgSessionSeconds: number
}

interface NotionConfig {
  apiKey: string
  pageId?: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

interface API {
  // Window controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // Task CRUD
  createTask: (data: CreateTaskInput) => Promise<Task>
  listTasks: (archived?: boolean) => Promise<Task[]>
  getTask: (id: number) => Promise<Task | undefined>
  updateTask: (id: number, data: UpdateTaskInput) => Promise<void>
  updateTaskNotes: (id: number, notes: string | null) => Promise<void>
  searchMentions: (
    query: string
  ) => Promise<Array<{ id: number; label: string; type: 'task' | 'project' | 'context' }>>
  syncTaskNotes: (id: number) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  bulkDeleteTasks: (ids: number[]) => Promise<void>
  bulkUpdateStatus: (ids: number[], status: TaskStatus) => Promise<void>
  bulkMoveToProject: (ids: number[], projectId: number | null) => Promise<void>
  archiveTask: (id: number) => Promise<void>
  unarchiveTask: (id: number) => Promise<void>
  startTask: (id: number) => Promise<void>
  stopTask: (id: number) => Promise<void>
  updateTimer: (id: number, seconds: number) => Promise<void>
  resetTask: (id: number) => Promise<void>
  addManualTime: (id: number, seconds: number) => Promise<void>
  setTotalTime: (id: number, seconds: number) => Promise<void>
  updateStatus: (id: number, status: TaskStatus) => Promise<void>
  getTimeEntries: (taskId: number) => Promise<TimeEntry[]>
  getActiveTimeEntry: (taskId: number) => Promise<TimeEntry | undefined>
  showNotification: (title: string, body: string) => void

  // Float window controls
  updateFloatTimer: (timers: FloatTimerData[]) => Promise<void>
  clearFloatTimer: () => Promise<void>
  restoreFromFloat: () => Promise<void>
  stopFromFloat: (taskId: number) => Promise<void>
  stopAllFromFloat: () => Promise<void>
  onFloatUpdate: (callback: (timers: FloatTimerData[]) => void) => () => void
  onFloatClear: (callback: () => void) => () => void
  onTimerStopped: (callback: (taskId: number) => void) => () => void

  // Tasks refresh event
  onTasksRefresh: (callback: () => void) => () => void

  // Statistics
  getWeeklyStats: () => Promise<DailyStats[]>
  getTaskTimeStats: () => Promise<TaskTimeStats[]>
  getStatusStats: () => Promise<StatusStats[]>
  getCategoryStats: () => Promise<CategoryStats[]>
  getHeatmapData: () => Promise<HeatmapData[]>
  getGeneralStats: () => Promise<GeneralStats>
  // FASE 4.2: Advanced stats
  getGtdMetrics: () => Promise<GtdMetrics>
  getEnergyStats: () => Promise<EnergyStats[]>
  generateWeeklyPDF: () => Promise<void>

  // Tags
  createTag: (name: string, color?: string) => Promise<Tag>
  listTags: () => Promise<Tag[]>
  getOrCreateTag: (name: string) => Promise<Tag>
  deleteTag: (id: number) => Promise<void>
  getTaskTags: (taskId: number) => Promise<Tag[]>
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>

  // Projects
  createProject: (data: CreateProjectInput) => Promise<Project>
  getProject: (id: number) => Promise<Project | undefined>
  listProjects: (status?: ProjectStatus) => Promise<Project[]>
  updateProject: (id: number, data: UpdateProjectInput) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  getProjectTasks: (projectId: number) => Promise<Task[]>

  // Contexts
  createContext: (name: string, icon?: string, color?: string) => Promise<Context>
  listContexts: () => Promise<Context[]>
  updateContext: (
    id: number,
    data: { name?: string; icon?: string; color?: string }
  ) => Promise<void>
  deleteContext: (id: number) => Promise<void>
  getTaskContexts: (taskId: number) => Promise<Context[]>
  setTaskContexts: (taskId: number, contextIds: number[]) => Promise<void>

  // Weekly Reviews
  createWeeklyReview: () => Promise<WeeklyReview>
  getWeeklyReview: (id: number) => Promise<WeeklyReview | undefined>
  listWeeklyReviews: () => Promise<WeeklyReview[]>
  getLastWeeklyReview: () => Promise<WeeklyReview | undefined>
  updateWeeklyReview: (
    id: number,
    data: {
      inbox_cleared?: boolean
      notes?: string
      checklist_state?: string
      completed_at?: string
    }
  ) => Promise<void>
  getReviewHealthIndicators: () => Promise<ReviewHealthIndicators>

  // FASE 2: Subtarefas
  listSubtasks: (parentId: number) => Promise<Task[]>
  createSubtask: (data: { name: string; parent_task_id: number }) => Promise<Task>

  // FASE 2: Dependências
  getDependencies: (taskId: number) => Promise<TaskDependency[]>
  addDependency: (taskId: number, dependsOnId: number) => Promise<void>
  removeDependency: (taskId: number, dependsOnId: number) => Promise<void>

  // FASE 2: Agendamento
  getTasksForDate: (date: string) => Promise<Task[]>
  getWeeklySchedule: (startDate: string) => Promise<{ date: string; tasks: Task[] }[]>
  updateDayOrder: (taskId: number, order: number) => Promise<void>
  scheduleTaskForDate: (taskId: number, date: string | null) => Promise<void>

  // FASE 2: Eventos push
  onTaskUnblocked: (callback: (taskId: number, taskName: string) => void) => () => void

  // Quick Capture
  openQuickCapture: () => Promise<void>
  quickCapture: (name: string) => Promise<Task>
  closeQuickCapture: () => Promise<void>

  // Notion Integration
  notionGetConfig: () => Promise<NotionConfig | null>
  notionSaveConfig: (config: NotionConfig) => Promise<void>
  notionClearConfig: () => Promise<void>
  notionTestConnection: () => Promise<{ success: boolean; message: string }>
  notionSyncTask: (taskId: number) => Promise<string>
  notionSyncAllTasks: () => Promise<{ success: number; failed: number }>
  notionCreateDatabase: () => Promise<string>

  // FASE 4.3: Blocos de Tempo
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  getTimeBlocksForDate: (date: string) => Promise<TimeBlock[]>
  getTimeBlocksForWeek: (startDate: string) => Promise<TimeBlock[]>
  getTimeBlocksForMonth: (yearMonth: string) => Promise<TimeBlock[]>
  updateTimeBlock: (id: number, data: UpdateTimeBlockInput) => Promise<void>
  deleteTimeBlock: (id: number) => Promise<void>

  // FASE 4: Áreas de Foco
  createArea: (data: CreateAreaInput) => Promise<Area>
  getArea: (id: number) => Promise<Area | undefined>
  listAreas: () => Promise<Area[]>
  updateArea: (id: number, data: UpdateAreaInput) => Promise<void>
  deleteArea: (id: number) => Promise<void>

  // FASE 4: Objetivos (Goals)
  createGoal: (data: CreateGoalInput) => Promise<Goal>
  getGoal: (id: number) => Promise<Goal | undefined>
  listGoals: (areaId?: number) => Promise<Goal[]>
  updateGoal: (id: number, data: UpdateGoalInput) => Promise<void>
  deleteGoal: (id: number) => Promise<void>

  // Sync notification events
  onSyncStart?: (callback: (event: unknown, taskName?: string) => void) => void
  offSyncStart?: (callback: (event: unknown, taskName?: string) => void) => void
  onSyncSuccess?: (callback: (event: unknown, taskName?: string) => void) => void
  offSyncSuccess?: (callback: (event: unknown, taskName?: string) => void) => void
  onSyncError?: (callback: (event: unknown, error?: string) => void) => void
  offSyncError?: (callback: (event: unknown, error?: string) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
