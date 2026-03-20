import { app, shell, BrowserWindow, ipcMain, Notification, screen, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/512.png?asset'
import {
  initDatabase,
  closeDatabase,
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  archiveTask,
  unarchiveTask,
  updateTaskStatus,
  startTask,
  stopTask,
  updateTimer,
  getTimeEntries,
  getActiveTimeEntry,
  resetTaskTimer,
  addManualTimeEntry,
  setTaskTotalTime,
  getWeeklyStats,
  getTaskTimeStats,
  getStatusStats,
  getCategoryStats,
  getHeatmapData,
  getGeneralStats,
  // Tags
  createTag,
  listTags,
  getOrCreateTag,
  deleteTag,
  getTaskTags,
  setTaskTags,
  // Projects
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectTasks,
  // Contexts
  createContext,
  listContexts,
  updateContext,
  deleteContext,
  getTaskContexts,
  setTaskContexts,
  // Weekly Reviews
  createWeeklyReview,
  getWeeklyReview,
  listWeeklyReviews,
  getLastWeeklyReview,
  updateWeeklyReview,
  getReviewHealthIndicators
} from './database'
import {
  // Notion
  getNotionConfig,
  saveNotionConfig,
  clearNotionConfig,
  testNotionConnection,
  syncTaskToNotion,
  syncAllTasks,
  findOrCreateDatabase,
  deleteTaskFromNotion,
  type NotionConfig
} from './notion'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus
} from '../shared/types'

let mainWindow: BrowserWindow | null = null
let floatWindow: BrowserWindow | null = null
let quickCaptureWindow: BrowserWindow | null = null
let currentTimerData: { taskId: number; taskName: string; seconds: number } | null = null

// Atalho global padrão para captura rápida
let quickCaptureShortcut = 'CommandOrControl+Shift+Space'

// Helper para sincronização automática com Notion
async function autoSyncToNotion(taskId: number): Promise<void> {
  const config = getNotionConfig()
  if (config?.autoSync && config.databaseId) {
    try {
      const task = getTask(taskId)
      if (task) {
        mainWindow?.webContents.send('notion:syncStart', task.name)
        await syncTaskToNotion(task)
        console.log('Tarefa sincronizada automaticamente:', task.name)
        mainWindow?.webContents.send('notion:syncSuccess', task.name)
      }
    } catch (error) {
      console.error('Erro na sincronização automática:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      mainWindow?.webContents.send('notion:syncError', errorMessage)
    }
  }
}

// ===================== FLOAT WINDOW =====================

function createFloatWindow(): void {
  if (floatWindow) {
    floatWindow.show()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize

  floatWindow = new BrowserWindow({
    width: 280,
    height: 70,
    x: width - 300,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/float`)
  } else {
    floatWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/float' })
  }

  floatWindow.on('closed', () => {
    floatWindow = null
  })
}

function showFloatWindow(): void {
  if (!floatWindow) {
    createFloatWindow()
  }

  if (floatWindow && !floatWindow.isVisible()) {
    floatWindow.once('ready-to-show', () => {
      floatWindow?.show()
      if (currentTimerData) {
        floatWindow?.webContents.send('float:update', currentTimerData)
      } else {
        floatWindow?.webContents.send('float:clear')
      }
    })

    if (floatWindow.webContents.isLoading() === false) {
      floatWindow.show()
      if (currentTimerData) {
        floatWindow.webContents.send('float:update', currentTimerData)
      } else {
        floatWindow.webContents.send('float:clear')
      }
    }
  }
}

function hideFloatWindow(): void {
  if (floatWindow) {
    floatWindow.hide()
  }
}

function clearFloatWindowState(): void {
  currentTimerData = null
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.destroy()
    floatWindow = null
  }
}

function updateFloatWindow(data: { taskId: number; taskName: string; seconds: number }): void {
  currentTimerData = data
  if (floatWindow && !floatWindow.isDestroyed() && floatWindow.isVisible()) {
    floatWindow.webContents.send('float:update', data)
  }
}

// ===================== QUICK CAPTURE WINDOW =====================

function createQuickCaptureWindow(): void {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  quickCaptureWindow = new BrowserWindow({
    width: 400,
    height: 140,
    x: Math.round(width / 2 - 200),
    y: Math.round(height / 3),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickCaptureWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/quick-capture`)
  } else {
    quickCaptureWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/quick-capture' })
  }

  quickCaptureWindow.once('ready-to-show', () => {
    quickCaptureWindow?.show()
  })

  quickCaptureWindow.on('blur', () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.close()
    }
  })

  quickCaptureWindow.on('closed', () => {
    quickCaptureWindow = null
  })
}

function registerGlobalShortcut(): void {
  try {
    globalShortcut.register(quickCaptureShortcut, () => {
      createQuickCaptureWindow()
    })
  } catch (error) {
    console.error('Erro ao registrar atalho global:', error)
  }
}

// ===================== MAIN WINDOW =====================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'TickTask App',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('minimize', () => {
    if (currentTimerData) {
      showFloatWindow()
    }
  })

  mainWindow.on('restore', () => {
    hideFloatWindow()
  })

  mainWindow.on('focus', () => {
    hideFloatWindow()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ===================== IPC HANDLERS =====================

function setupIpcHandlers(): void {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())

  // Task CRUD
  ipcMain.handle('task:create', (_, data: CreateTaskInput) => {
    const task = createTask(data)
    autoSyncToNotion(task.id)
    return task
  })
  ipcMain.handle('task:list', (_, archived?: boolean) => listTasks(archived))
  ipcMain.handle('task:get', (_, id: number) => getTask(id))
  ipcMain.handle('task:update', (_, id: number, data: UpdateTaskInput) => {
    updateTask(id, data)
    autoSyncToNotion(id)
  })
  ipcMain.handle('task:delete', (_, id: number) => {
    const config = getNotionConfig()
    if (config?.autoSync && config.databaseId) {
      deleteTaskFromNotion(id).catch((error) => {
        console.error('Erro ao deletar do Notion:', error)
      })
    }
    deleteTask(id)
  })

  // Archive
  ipcMain.handle('task:archive', (_, id: number) => {
    archiveTask(id)
    autoSyncToNotion(id)
  })
  ipcMain.handle('task:unarchive', (_, id: number) => {
    unarchiveTask(id)
    autoSyncToNotion(id)
  })

  // Timer
  ipcMain.handle('task:start', (_, id: number) => startTask(id))
  ipcMain.handle('task:stop', (_, id: number) => {
    const result = stopTask(id)
    autoSyncToNotion(id)
    return result
  })
  ipcMain.handle('task:updateTimer', (_, id: number, seconds: number) => updateTimer(id, seconds))
  ipcMain.handle('task:reset', (_, id: number) => {
    resetTaskTimer(id)
    autoSyncToNotion(id)
  })
  ipcMain.handle('task:addManualTime', (_, id: number, seconds: number) => {
    addManualTimeEntry(id, seconds)
    autoSyncToNotion(id)
  })
  ipcMain.handle('task:setTotalTime', (_, id: number, seconds: number) => {
    setTaskTotalTime(id, seconds)
    autoSyncToNotion(id)
  })

  // Status
  ipcMain.handle('task:updateStatus', (_, id: number, status: TaskStatus) => {
    updateTaskStatus(id, status)
    autoSyncToNotion(id)
  })

  // Time Entries
  ipcMain.handle('task:getTimeEntries', (_, taskId: number) => getTimeEntries(taskId))
  ipcMain.handle('task:getActiveTimeEntry', (_, taskId: number) => getActiveTimeEntry(taskId))

  // Notifications
  ipcMain.handle('notification:show', (_, title: string, body: string) => {
    new Notification({ title, body }).show()
  })

  // Float window controls
  ipcMain.handle(
    'float:updateTimer',
    (_, data: { taskId: number; taskName: string; seconds: number }) => {
      updateFloatWindow(data)
    }
  )
  ipcMain.handle('float:clearTimer', () => {
    clearFloatWindowState()
    hideFloatWindow()
  })
  ipcMain.handle('float:restore', () => {
    if (mainWindow) {
      mainWindow.restore()
      mainWindow.focus()
    }
    hideFloatWindow()
  })
  ipcMain.handle('float:stopTimer', async (_, taskId: number) => {
    const result = await stopTask(taskId)
    clearFloatWindowState()
    hideFloatWindow()
    mainWindow?.webContents.send('timer:stopped', taskId)
    return result
  })

  // Statistics
  ipcMain.handle('stats:weekly', () => getWeeklyStats())
  ipcMain.handle('stats:taskTime', () => getTaskTimeStats())
  ipcMain.handle('stats:status', () => getStatusStats())
  ipcMain.handle('stats:category', () => getCategoryStats())
  ipcMain.handle('stats:heatmap', () => getHeatmapData())
  ipcMain.handle('stats:general', () => getGeneralStats())

  // Tags
  ipcMain.handle('tag:create', (_, name: string, color?: string) => createTag(name, color))
  ipcMain.handle('tag:list', () => listTags())
  ipcMain.handle('tag:getOrCreate', (_, name: string) => getOrCreateTag(name))
  ipcMain.handle('tag:delete', (_, id: number) => deleteTag(id))
  ipcMain.handle('tag:getTaskTags', (_, taskId: number) => getTaskTags(taskId))
  ipcMain.handle('tag:setTaskTags', (_, taskId: number, tagIds: number[]) => {
    setTaskTags(taskId, tagIds)
    autoSyncToNotion(taskId)
  })

  // ===================== PROJECTS =====================
  ipcMain.handle('project:create', (_, data: CreateProjectInput) => createProject(data))
  ipcMain.handle('project:get', (_, id: number) => getProject(id))
  ipcMain.handle('project:list', (_, status?: ProjectStatus) => listProjects(status))
  ipcMain.handle('project:update', (_, id: number, data: UpdateProjectInput) => updateProject(id, data))
  ipcMain.handle('project:delete', (_, id: number) => deleteProject(id))
  ipcMain.handle('project:getTasks', (_, projectId: number) => getProjectTasks(projectId))

  // ===================== CONTEXTS =====================
  ipcMain.handle('context:create', (_, name: string, icon?: string, color?: string) =>
    createContext(name, icon, color)
  )
  ipcMain.handle('context:list', () => listContexts())
  ipcMain.handle('context:update', (_, id: number, data: { name?: string; icon?: string; color?: string }) =>
    updateContext(id, data)
  )
  ipcMain.handle('context:delete', (_, id: number) => deleteContext(id))
  ipcMain.handle('context:getTaskContexts', (_, taskId: number) => getTaskContexts(taskId))
  ipcMain.handle('context:setTaskContexts', (_, taskId: number, contextIds: number[]) =>
    setTaskContexts(taskId, contextIds)
  )

  // ===================== WEEKLY REVIEWS =====================
  ipcMain.handle('review:create', () => createWeeklyReview())
  ipcMain.handle('review:get', (_, id: number) => getWeeklyReview(id))
  ipcMain.handle('review:list', () => listWeeklyReviews())
  ipcMain.handle('review:getLast', () => getLastWeeklyReview())
  ipcMain.handle(
    'review:update',
    (
      _,
      id: number,
      data: { inbox_cleared?: boolean; notes?: string; checklist_state?: string; completed_at?: string }
    ) => updateWeeklyReview(id, data)
  )
  ipcMain.handle('review:healthIndicators', () => getReviewHealthIndicators())

  // ===================== QUICK CAPTURE =====================
  ipcMain.handle('quickCapture:open', () => {
    createQuickCaptureWindow()
  })
  ipcMain.handle('quickCapture:capture', (_, name: string) => {
    const task = createTask({ name })
    // Fechar a janela de captura
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.close()
    }
    // Notificar a janela principal para atualizar
    mainWindow?.webContents.send('tasks:refresh')
    // Mostrar notificação
    new Notification({
      title: 'TickTask',
      body: `"${name}" capturado para Inbox`
    }).show()
    return task
  })
  ipcMain.handle('quickCapture:close', () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.close()
    }
  })

  // Notion Integration
  ipcMain.handle('notion:getConfig', () => getNotionConfig())
  ipcMain.handle('notion:saveConfig', (_, config: NotionConfig) => saveNotionConfig(config))
  ipcMain.handle('notion:clearConfig', () => clearNotionConfig())
  ipcMain.handle('notion:testConnection', () => testNotionConnection())
  ipcMain.handle('notion:syncTask', async (_, taskId: number) => {
    const task = getTask(taskId)
    if (!task) throw new Error('Tarefa não encontrada')
    return syncTaskToNotion(task)
  })
  ipcMain.handle('notion:syncAllTasks', async () => {
    const tasks = listTasks(false)
    return syncAllTasks(tasks)
  })
  ipcMain.handle('notion:createDatabase', () => findOrCreateDatabase())
}

// ===================== APP LIFECYCLE =====================

app.whenReady().then(() => {
  initDatabase()
  setupIpcHandlers()

  electronApp.setAppUserModelId('com.ticktask.app')
  try {
    app.setName('TickTask App')
  } catch {
    // setName isn't available on all platforms/versions
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Registrar atalho global para captura rápida
  registerGlobalShortcut()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
  closeDatabase()
})
