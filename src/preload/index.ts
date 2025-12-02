import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Task, TimeEntry, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../shared/types'

// Custom APIs for renderer
const api = {
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
  }
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
