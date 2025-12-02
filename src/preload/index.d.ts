import { ElectronAPI } from '@electron-toolkit/preload'
import type { Task, TimeEntry, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../shared/types'

interface FloatTimerData {
  taskId: number
  taskName: string
  seconds: number
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
  onTimerStopped: (callback: (taskId: number) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
