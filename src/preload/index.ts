import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
  ReviewHealthIndicators
} from '../shared/types'

// Custom APIs for renderer
const api = {
  // Window controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),

  // Task CRUD
  createTask: (data: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('task:create', data),
  listTasks: (archived?: boolean): Promise<Task[]> => ipcRenderer.invoke('task:list', archived),
  getTask: (id: number): Promise<Task | undefined> => ipcRenderer.invoke('task:get', id),
  updateTask: (id: number, data: UpdateTaskInput): Promise<void> =>
    ipcRenderer.invoke('task:update', id, data),
  deleteTask: (id: number): Promise<void> => ipcRenderer.invoke('task:delete', id),

  // Archive
  archiveTask: (id: number): Promise<void> => ipcRenderer.invoke('task:archive', id),
  unarchiveTask: (id: number): Promise<void> => ipcRenderer.invoke('task:unarchive', id),

  // Timer
  startTask: (id: number): Promise<void> => ipcRenderer.invoke('task:start', id),
  stopTask: (id: number): Promise<void> => ipcRenderer.invoke('task:stop', id),
  updateTimer: (id: number, seconds: number): Promise<void> =>
    ipcRenderer.invoke('task:updateTimer', id, seconds),
  resetTask: (id: number): Promise<void> => ipcRenderer.invoke('task:reset', id),
  addManualTime: (id: number, seconds: number): Promise<void> =>
    ipcRenderer.invoke('task:addManualTime', id, seconds),
  setTotalTime: (id: number, seconds: number): Promise<void> =>
    ipcRenderer.invoke('task:setTotalTime', id, seconds),

  // Status
  updateStatus: (id: number, status: TaskStatus): Promise<void> =>
    ipcRenderer.invoke('task:updateStatus', id, status),

  // Time Entries
  getTimeEntries: (taskId: number): Promise<TimeEntry[]> =>
    ipcRenderer.invoke('task:getTimeEntries', taskId),
  getActiveTimeEntry: (taskId: number): Promise<TimeEntry | undefined> =>
    ipcRenderer.invoke('task:getActiveTimeEntry', taskId),

  // Notifications
  showNotification: (title: string, body: string): void => {
    ipcRenderer.invoke('notification:show', title, body)
  },

  // Float window controls
  updateFloatTimer: (data: { taskId: number; taskName: string; seconds: number }): Promise<void> =>
    ipcRenderer.invoke('float:updateTimer', data),
  clearFloatTimer: (): Promise<void> => ipcRenderer.invoke('float:clearTimer'),
  restoreFromFloat: (): Promise<void> => ipcRenderer.invoke('float:restore'),
  stopFromFloat: (taskId: number): Promise<void> => ipcRenderer.invoke('float:stopTimer', taskId),

  // Float window events
  onFloatUpdate: (
    callback: (data: { taskId: number; taskName: string; seconds: number }) => void
  ): (() => void) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      data: { taskId: number; taskName: string; seconds: number }
    ): void => {
      callback(data)
    }
    ipcRenderer.on('float:update', handler)
    return () => ipcRenderer.removeListener('float:update', handler)
  },

  onFloatClear: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('float:clear', handler)
    return () => ipcRenderer.removeListener('float:clear', handler)
  },

  onTimerStopped: (callback: (taskId: number) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, taskId: number): void => {
      callback(taskId)
    }
    ipcRenderer.on('timer:stopped', handler)
    return () => ipcRenderer.removeListener('timer:stopped', handler)
  },

  // Tasks refresh event (from quick capture)
  onTasksRefresh: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('tasks:refresh', handler)
    return () => ipcRenderer.removeListener('tasks:refresh', handler)
  },

  // Statistics
  getWeeklyStats: (): Promise<DailyStats[]> => ipcRenderer.invoke('stats:weekly'),
  getTaskTimeStats: (): Promise<TaskTimeStats[]> => ipcRenderer.invoke('stats:taskTime'),
  getStatusStats: (): Promise<StatusStats[]> => ipcRenderer.invoke('stats:status'),
  getCategoryStats: (): Promise<CategoryStats[]> => ipcRenderer.invoke('stats:category'),
  getHeatmapData: (): Promise<HeatmapData[]> => ipcRenderer.invoke('stats:heatmap'),
  getGeneralStats: (): Promise<GeneralStats> => ipcRenderer.invoke('stats:general'),

  // Tags
  createTag: (name: string, color?: string): Promise<Tag> =>
    ipcRenderer.invoke('tag:create', name, color),
  listTags: (): Promise<Tag[]> => ipcRenderer.invoke('tag:list'),
  getOrCreateTag: (name: string): Promise<Tag> => ipcRenderer.invoke('tag:getOrCreate', name),
  deleteTag: (id: number): Promise<void> => ipcRenderer.invoke('tag:delete', id),
  getTaskTags: (taskId: number): Promise<Tag[]> => ipcRenderer.invoke('tag:getTaskTags', taskId),
  setTaskTags: (taskId: number, tagIds: number[]): Promise<void> =>
    ipcRenderer.invoke('tag:setTaskTags', taskId, tagIds),

  // ===================== PROJECTS =====================
  createProject: (data: CreateProjectInput): Promise<Project> =>
    ipcRenderer.invoke('project:create', data),
  getProject: (id: number): Promise<Project | undefined> =>
    ipcRenderer.invoke('project:get', id),
  listProjects: (status?: ProjectStatus): Promise<Project[]> =>
    ipcRenderer.invoke('project:list', status),
  updateProject: (id: number, data: UpdateProjectInput): Promise<void> =>
    ipcRenderer.invoke('project:update', id, data),
  deleteProject: (id: number): Promise<void> => ipcRenderer.invoke('project:delete', id),
  getProjectTasks: (projectId: number): Promise<Task[]> =>
    ipcRenderer.invoke('project:getTasks', projectId),

  // ===================== CONTEXTS =====================
  createContext: (name: string, icon?: string, color?: string): Promise<Context> =>
    ipcRenderer.invoke('context:create', name, icon, color),
  listContexts: (): Promise<Context[]> => ipcRenderer.invoke('context:list'),
  updateContext: (
    id: number,
    data: { name?: string; icon?: string; color?: string }
  ): Promise<void> => ipcRenderer.invoke('context:update', id, data),
  deleteContext: (id: number): Promise<void> => ipcRenderer.invoke('context:delete', id),
  getTaskContexts: (taskId: number): Promise<Context[]> =>
    ipcRenderer.invoke('context:getTaskContexts', taskId),
  setTaskContexts: (taskId: number, contextIds: number[]): Promise<void> =>
    ipcRenderer.invoke('context:setTaskContexts', taskId, contextIds),

  // ===================== WEEKLY REVIEWS =====================
  createWeeklyReview: (): Promise<WeeklyReview> => ipcRenderer.invoke('review:create'),
  getWeeklyReview: (id: number): Promise<WeeklyReview | undefined> =>
    ipcRenderer.invoke('review:get', id),
  listWeeklyReviews: (): Promise<WeeklyReview[]> => ipcRenderer.invoke('review:list'),
  getLastWeeklyReview: (): Promise<WeeklyReview | undefined> =>
    ipcRenderer.invoke('review:getLast'),
  updateWeeklyReview: (
    id: number,
    data: {
      inbox_cleared?: boolean
      notes?: string
      checklist_state?: string
      completed_at?: string
    }
  ): Promise<void> => ipcRenderer.invoke('review:update', id, data),
  getReviewHealthIndicators: (): Promise<ReviewHealthIndicators> =>
    ipcRenderer.invoke('review:healthIndicators'),

  // ===================== QUICK CAPTURE =====================
  openQuickCapture: (): Promise<void> => ipcRenderer.invoke('quickCapture:open'),
  quickCapture: (name: string): Promise<Task> => ipcRenderer.invoke('quickCapture:capture', name),
  closeQuickCapture: (): Promise<void> => ipcRenderer.invoke('quickCapture:close'),

  // Notion Integration
  notionGetConfig: (): Promise<NotionConfig | null> => ipcRenderer.invoke('notion:getConfig'),
  notionSaveConfig: (config: NotionConfig): Promise<void> =>
    ipcRenderer.invoke('notion:saveConfig', config),
  notionClearConfig: (): Promise<void> => ipcRenderer.invoke('notion:clearConfig'),
  notionTestConnection: (): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('notion:testConnection'),
  notionSyncTask: (taskId: number): Promise<string> =>
    ipcRenderer.invoke('notion:syncTask', taskId),
  notionSyncAllTasks: (): Promise<{ success: number; failed: number }> =>
    ipcRenderer.invoke('notion:syncAllTasks'),
  notionCreateDatabase: (): Promise<string> => ipcRenderer.invoke('notion:createDatabase'),

  // Sync notification events
  onSyncStart: (callback: (event: unknown, taskName?: string) => void): void => {
    ipcRenderer.on('notion:syncStart', callback)
  },
  offSyncStart: (callback: (event: unknown, taskName?: string) => void): void => {
    ipcRenderer.removeListener('notion:syncStart', callback)
  },
  onSyncSuccess: (callback: (event: unknown, taskName?: string) => void): void => {
    ipcRenderer.on('notion:syncSuccess', callback)
  },
  offSyncSuccess: (callback: (event: unknown, taskName?: string) => void): void => {
    ipcRenderer.removeListener('notion:syncSuccess', callback)
  },
  onSyncError: (callback: (event: unknown, error?: string) => void): void => {
    ipcRenderer.on('notion:syncError', callback)
  },
  offSyncError: (callback: (event: unknown, error?: string) => void): void => {
    ipcRenderer.removeListener('notion:syncError', callback)
  }
}

// Types for statistics
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
  pageId: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
