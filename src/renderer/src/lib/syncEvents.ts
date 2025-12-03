// Tipos e estados de sincronização
export interface SyncState {
  isActive: boolean
  taskName?: string
  status: 'syncing' | 'success' | 'error'
  message?: string
}

// Event emitter para sincronização
export const syncEvents = {
  listeners: new Set<(state: SyncState) => void>(),
  subscribe(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  },
  emit(state: SyncState): void {
    this.listeners.forEach((cb) => cb(state))
  }
}

// Funções para disparar eventos de sync
export function notifySyncStart(taskName?: string): void {
  syncEvents.emit({
    isActive: true,
    taskName,
    status: 'syncing',
    message: taskName ? `Sincronizando "${taskName}"...` : 'Sincronizando com Notion...'
  })
}

export function notifySyncSuccess(taskName?: string): void {
  syncEvents.emit({
    isActive: true,
    taskName,
    status: 'success',
    message: taskName ? `"${taskName}" sincronizada!` : 'Sincronização concluída!'
  })

  // Auto-hide após 2 segundos
  setTimeout(() => {
    syncEvents.emit({
      isActive: false,
      status: 'success'
    })
  }, 2000)
}

export function notifySyncError(error?: string): void {
  syncEvents.emit({
    isActive: true,
    status: 'error',
    message: error || 'Erro na sincronização'
  })

  // Auto-hide após 3 segundos
  setTimeout(() => {
    syncEvents.emit({
      isActive: false,
      status: 'error'
    })
  }, 3000)
}
