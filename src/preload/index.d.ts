import { ElectronAPI } from '@electron-toolkit/preload'
import type { Task, TimeEntry, CreateTaskInput, UpdateTaskInput, TaskStatus, Tag } from '../shared/types'

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
  deleteTask: (id: number) => Promise<void>
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
  updateFloatTimer: (data: FloatTimerData) => Promise<void>
  clearFloatTimer: () => Promise<void>
  restoreFromFloat: () => Promise<void>
  stopFromFloat: (taskId: number) => Promise<void>
  onFloatUpdate: (callback: (data: FloatTimerData) => void) => () => void
  onFloatClear: (callback: () => void) => () => void
  onTimerStopped: (callback: (taskId: number) => void) => () => void

  // Statistics
  getWeeklyStats: () => Promise<DailyStats[]>
  getTaskTimeStats: () => Promise<TaskTimeStats[]>
  getStatusStats: () => Promise<StatusStats[]>
  getCategoryStats: () => Promise<CategoryStats[]>
  getHeatmapData: () => Promise<HeatmapData[]>
  getGeneralStats: () => Promise<GeneralStats>

  // Tags
  createTag: (name: string, color?: string) => Promise<Tag>
  listTags: () => Promise<Tag[]>
  getOrCreateTag: (name: string) => Promise<Tag>
  deleteTag: (id: number) => Promise<void>
  getTaskTags: (taskId: number) => Promise<Tag[]>
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>

  // Notion Integration
  notionGetConfig: () => Promise<NotionConfig | null>
  notionSaveConfig: (config: NotionConfig) => Promise<void>
  notionClearConfig: () => Promise<void>
  notionTestConnection: () => Promise<{ success: boolean; message: string }>
  notionSyncTask: (taskId: number) => Promise<string>
  notionSyncAllTasks: () => Promise<{ success: number; failed: number }>
  notionCreateDatabase: () => Promise<string>

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
