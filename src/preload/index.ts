import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Task, TimeEntry, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../shared/types'

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
    const handler = (_: Electron.IpcRendererEvent, data: { taskId: number; taskName: string; seconds: number }): void => {
      callback(data)
    }
    ipcRenderer.on('float:update', handler)
    return () => ipcRenderer.removeListener('float:update', handler)
  },

  // Timer stopped event (from float window)
  onTimerStopped: (callback: (taskId: number) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, taskId: number): void => {
      callback(taskId)
    }
    ipcRenderer.on('timer:stopped', handler)
    return () => ipcRenderer.removeListener('timer:stopped', handler)
  },

  // Statistics
  getWeeklyStats: (): Promise<DailyStats[]> => ipcRenderer.invoke('stats:weekly'),
  getTaskTimeStats: (): Promise<TaskTimeStats[]> => ipcRenderer.invoke('stats:taskTime'),
  getStatusStats: (): Promise<StatusStats[]> => ipcRenderer.invoke('stats:status'),
  getCategoryStats: (): Promise<CategoryStats[]> => ipcRenderer.invoke('stats:category'),
  getHeatmapData: (): Promise<HeatmapData[]> => ipcRenderer.invoke('stats:heatmap'),
  getGeneralStats: (): Promise<GeneralStats> => ipcRenderer.invoke('stats:general')
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

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
