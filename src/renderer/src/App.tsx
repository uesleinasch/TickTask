import { useCallback } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { TaskListPage } from './pages/TaskListPage'
import { SingleTaskPage } from './pages/SingleTaskPage'
import { ArchivedTasksPage } from './pages/ArchivedTasksPage'
import { TitleBar } from './components/TitleBar'
import { FloatingTimer } from './components/FloatingTimer'
import { Toaster } from './components/ui/sonner'

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

function AppContent(): React.JSX.Element {
  const location = useLocation()
  const isTaskPage = location.pathname.startsWith('/task/')

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
        </Routes>
      </main>
      {!isTaskPage && <FloatingTimer />}
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
