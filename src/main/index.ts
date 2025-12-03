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
  getGeneralStats
} from './database'
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let floatWindow: BrowserWindow | null = null
let currentTimerData: { taskId: number; taskName: string; seconds: number } | null = null

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

  // Task CRUD
  ipcMain.handle('task:create', (_, data: CreateTaskInput) => createTask(data))
  ipcMain.handle('task:list', (_, archived?: boolean) => listTasks(archived))
  ipcMain.handle('task:get', (_, id: number) => getTask(id))
  ipcMain.handle('task:update', (_, id: number, data: UpdateTaskInput) => updateTask(id, data))
  ipcMain.handle('task:delete', (_, id: number) => deleteTask(id))

  // Archive
  ipcMain.handle('task:archive', (_, id: number) => archiveTask(id))
  ipcMain.handle('task:unarchive', (_, id: number) => unarchiveTask(id))

  // Timer
  ipcMain.handle('task:start', (_, id: number) => startTask(id))
  ipcMain.handle('task:stop', (_, id: number) => stopTask(id))
  ipcMain.handle('task:updateTimer', (_, id: number, seconds: number) => updateTimer(id, seconds))
  ipcMain.handle('task:reset', (_, id: number) => resetTaskTimer(id))
  ipcMain.handle('task:addManualTime', (_, id: number, seconds: number) =>
    addManualTimeEntry(id, seconds)
  )
  ipcMain.handle('task:setTotalTime', (_, id: number, seconds: number) =>
    setTaskTotalTime(id, seconds)
  )

  // Status
  ipcMain.handle('task:updateStatus', (_, id: number, status: TaskStatus) =>
    updateTaskStatus(id, status)
  )

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
