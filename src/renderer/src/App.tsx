import { useCallback, useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { TaskListPage } from './pages/TaskListPage'
import { SingleTaskPage } from './pages/SingleTaskPage'
import { ArchivedTasksPage } from './pages/ArchivedTasksPage'
import { FloatTimerPage } from './pages/FloatTimerPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { TitleBar } from './components/TitleBar'
import { FloatingTimer } from './components/FloatingTimer'
import { SyncNotification } from './components/SyncNotification'
import { Toaster } from './components/ui/sonner'
import { notifySyncStart, notifySyncSuccess, notifySyncError } from './lib/syncEvents'
import { useTimerStore } from './stores/timerStore'

// Criar um event emitter simples para comunicação
const eventEmitter = {
  listeners: new Map<string, Set<() => void>>(),
  on(event: string, callback: () => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)
  },
  off(event: string, callback: () => void): void {
    this.listeners.get(event)?.delete(callback)
  },
  emit(event: string): void {
    this.listeners.get(event)?.forEach((cb) => cb())
  }
}

export { eventEmitter }

// Componente para a janela flutuante
function FloatContent(): React.JSX.Element {
  return (
    <div className="w-full h-full p-1">
      <FloatTimerPage />
    </div>
  )
}

function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isTaskPage = location.pathname.startsWith('/task/')
  const isDashboardPage = location.pathname === '/dashboard'
  const isFloatPage = location.pathname === '/float'

  // Listener para eventos de sincronização do main process
  useEffect(() => {
    const handleSyncStart = (_: unknown, taskName?: string): void => {
      notifySyncStart(taskName)
    }
    const handleSyncSuccess = (_: unknown, taskName?: string): void => {
      notifySyncSuccess(taskName)
    }
    const handleSyncError = (_: unknown, error?: string): void => {
      notifySyncError(error)
    }

    window.api.onSyncStart?.(handleSyncStart)
    window.api.onSyncSuccess?.(handleSyncSuccess)
    window.api.onSyncError?.(handleSyncError)

    return () => {
      window.api.offSyncStart?.(handleSyncStart)
      window.api.offSyncSuccess?.(handleSyncSuccess)
      window.api.offSyncError?.(handleSyncError)
    }
  }, [])

  // Listener para timer parado via float window
  useEffect(() => {
    const unsubscribe = window.api.onTimerStopped(() => {
      useTimerStore.getState().clearActiveTimer()
    })
    return unsubscribe
  }, [])

  // Se for a janela flutuante, renderizar apenas ela
  if (isFloatPage) {
    return <FloatContent />
  }

  const handleNewTask = useCallback(() => {
    eventEmitter.emit('open-new-task-dialog')
  }, [])

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <TitleBar onNewTask={handleNewTask} />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<TaskListPage />} />
          <Route path="/task/:id" element={<SingleTaskPage />} />
          <Route path="/archived" element={<ArchivedTasksPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/float" element={<FloatTimerPage />} />
        </Routes>
      </main>
      {!isTaskPage && !isDashboardPage && <FloatingTimer />}
      <SyncNotification />
      <Toaster position="bottom-right" />
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

export default App
