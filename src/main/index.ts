import { app, shell, BrowserWindow, ipcMain, Notification, screen } from 'electron'
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
  setTaskTags
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
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let floatWindow: BrowserWindow | null = null
let currentTimerData: { taskId: number; taskName: string; seconds: number } | null = null

// Helper para sincronização automática com Notion
async function autoSyncToNotion(taskId: number): Promise<void> {
  const config = getNotionConfig()
  if (config?.autoSync && config.databaseId) {
    try {
      const task = getTask(taskId)
      if (task) {
        // Notificar início da sincronização
        mainWindow?.webContents.send('notion:syncStart', task.name)
        
        await syncTaskToNotion(task)
        console.log('Tarefa sincronizada automaticamente:', task.name)
        
        // Notificar sucesso
        mainWindow?.webContents.send('notion:syncSuccess', task.name)
      }
    } catch (error) {
      console.error('Erro na sincronização automática:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      // Notificar erro
      mainWindow?.webContents.send('notion:syncError', errorMessage)
    }
  }
}

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
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Carregar a mesma URL mas com hash para float
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

  // Aguardar a janela carregar antes de mostrar
  if (floatWindow && !floatWindow.isVisible()) {
    floatWindow.once('ready-to-show', () => {
      floatWindow?.show()
      // Enviar dados do timer atual OU limpar se não há timer
      if (currentTimerData) {
        floatWindow?.webContents.send('float:update', currentTimerData)
      } else {
        // Garantir que a janela está limpa
        floatWindow?.webContents.send('float:clear')
      }
    })

    // Se já está pronta, apenas mostrar
    if (floatWindow.webContents.isLoading() === false) {
      floatWindow.show()
      if (currentTimerData) {
        floatWindow.webContents.send('float:update', currentTimerData)
      } else {
        // Garantir que a janela está limpa
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

// Limpar completamente o estado do float window e DESTRUIR a janela
function clearFloatWindowState(): void {
  console.log('[Main] clearFloatWindowState() chamado')
  currentTimerData = null
  
  // Destruir a janela float completamente
  // Isso garante que não há estado residual
  if (floatWindow && !floatWindow.isDestroyed()) {
    console.log('[Main] Destruindo janela float')
    floatWindow.destroy()
    floatWindow = null
  }
}

function updateFloatWindow(data: { taskId: number; taskName: string; seconds: number }): void {
  currentTimerData = data
  // IMPORTANTE: Enviar apenas se a janela estiver visível
  // Se não estiver visível, os dados serão enviados quando a janela for mostrada (showFloatWindow)
  if (floatWindow && !floatWindow.isDestroyed() && floatWindow.isVisible()) {
    floatWindow.webContents.send('float:update', data)
  }
}

function createWindow(): void {
  // Create the browser window.
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

  // Mostrar float window quando minimizar (se houver timer ativo)
  mainWindow.on('minimize', () => {
    if (currentTimerData) {
      showFloatWindow()
    }
  })

  // Esconder float window quando restaurar
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Setup IPC Handlers
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

  // Task CRUD - com sincronização automática do Notion
  ipcMain.handle('task:create', async (_, data: CreateTaskInput) => {
    const task = createTask(data)
    await autoSyncToNotion(task.id)
    return task
  })
  ipcMain.handle('task:list', (_, archived?: boolean) => listTasks(archived))
  ipcMain.handle('task:get', (_, id: number) => getTask(id))
  ipcMain.handle('task:update', async (_, id: number, data: UpdateTaskInput) => {
    updateTask(id, data)
    await autoSyncToNotion(id)
  })
  ipcMain.handle('task:delete', async (_, id: number) => {
    // Tentar remover do Notion antes de deletar localmente
    const config = getNotionConfig()
    if (config?.autoSync && config.databaseId) {
      try {
        await deleteTaskFromNotion(id)
      } catch (error) {
        console.error('Erro ao deletar do Notion:', error)
      }
    }
    deleteTask(id)
  })

  // Archive - com sincronização
  ipcMain.handle('task:archive', async (_, id: number) => {
    archiveTask(id)
    await autoSyncToNotion(id)
  })
  ipcMain.handle('task:unarchive', async (_, id: number) => {
    unarchiveTask(id)
    await autoSyncToNotion(id)
  })

  // Timer - com sincronização ao parar
  ipcMain.handle('task:start', (_, id: number) => startTask(id))
  ipcMain.handle('task:stop', async (_, id: number) => {
    const result = stopTask(id)
    await autoSyncToNotion(id) // Sincronizar tempo atualizado
    return result
  })
  ipcMain.handle('task:updateTimer', (_, id: number, seconds: number) => updateTimer(id, seconds))
  ipcMain.handle('task:reset', async (_, id: number) => {
    resetTaskTimer(id)
    await autoSyncToNotion(id)
  })
  ipcMain.handle('task:addManualTime', async (_, id: number, seconds: number) => {
    addManualTimeEntry(id, seconds)
    await autoSyncToNotion(id)
  })
  ipcMain.handle('task:setTotalTime', async (_, id: number, seconds: number) => {
    setTaskTotalTime(id, seconds)
    await autoSyncToNotion(id)
  })

  // Status - com sincronização
  ipcMain.handle('task:updateStatus', async (_, id: number, status: TaskStatus) => {
    updateTaskStatus(id, status)
    await autoSyncToNotion(id)
  })

  // Time Entries
  ipcMain.handle('task:getTimeEntries', (_, taskId: number) => getTimeEntries(taskId))
  ipcMain.handle('task:getActiveTimeEntry', (_, taskId: number) => getActiveTimeEntry(taskId))

  // Notifications
  ipcMain.handle('notification:show', (_, title: string, body: string) => {
    new Notification({
      title,
      body
    }).show()
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
    // Notificar a janela principal para atualizar
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

  // Tags - com sincronização ao atualizar tags da tarefa
  ipcMain.handle('tag:create', (_, name: string, color?: string) => createTag(name, color))
  ipcMain.handle('tag:list', () => listTags())
  ipcMain.handle('tag:getOrCreate', (_, name: string) => getOrCreateTag(name))
  ipcMain.handle('tag:delete', (_, id: number) => deleteTag(id))
  ipcMain.handle('tag:getTaskTags', (_, taskId: number) => getTaskTags(taskId))
  ipcMain.handle('tag:setTaskTags', async (_, taskId: number, tagIds: number[]) => {
    setTaskTags(taskId, tagIds)
    await autoSyncToNotion(taskId)
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
    const tasks = listTasks(false) // Apenas tarefas não arquivadas
    return syncAllTasks(tasks)
  })
  ipcMain.handle('notion:createDatabase', () => findOrCreateDatabase())
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Initialize database
  initDatabase()

  // Setup IPC handlers
  setupIpcHandlers()

  // Set app user model id for windows (matches appId in electron-builder.yml)
  electronApp.setAppUserModelId('com.ticktask.app')
  // Set app name for macOS menus and about dialogs
  try {
    app.setName('TickTask App')
  } catch (error) {
    // setName isn't available on all platforms/versions
  }

  // (Already set above)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
