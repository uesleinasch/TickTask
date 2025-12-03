import { useState, useEffect, useCallback } from 'react'
import { Cloud, Check, X, Loader2 } from 'lucide-react'
import { syncEvents, type SyncState } from '@renderer/lib/syncEvents'

export function SyncNotification(): React.JSX.Element | null {
  const [syncState, setSyncState] = useState<SyncState>({
    isActive: false,
    status: 'syncing'
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = syncEvents.subscribe((state) => {
      setSyncState(state)
      if (state.isActive) {
        setIsVisible(true)
      } else {
        // Animação de saída
        setTimeout(() => setIsVisible(false), 300)
      }
    })

    return unsubscribe
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setSyncState((prev) => ({ ...prev, isActive: false }))
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-14 right-4 z-50 transition-all duration-300 ease-out ${
        syncState.isActive
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4 pointer-events-none'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm min-w-[280px] max-w-[400px] ${
          syncState.status === 'syncing'
            ? 'bg-slate-900/95 border-slate-700 text-white'
            : syncState.status === 'success'
              ? 'bg-emerald-600/95 border-emerald-500 text-white'
              : 'bg-red-600/95 border-red-500 text-white'
        }`}
      >
        {/* Icon */}
        <div className="shrink-0">
          {syncState.status === 'syncing' ? (
            <div className="relative">
              <Cloud size={20} className="text-white/80" />
              <Loader2 size={12} className="absolute -bottom-1 -right-1 animate-spin text-white" />
            </div>
          ) : syncState.status === 'success' ? (
            <div className="p-0.5 bg-white/20 rounded-full">
              <Check size={16} />
            </div>
          ) : (
            <div className="p-0.5 bg-white/20 rounded-full">
              <X size={16} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{syncState.message}</p>

          {/* Progress bar for syncing */}
          {syncState.status === 'syncing' && (
            <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full animate-pulse w-full origin-left" />
            </div>
          )}
        </div>

        {/* Close button (only for error or when hovering) */}
        {syncState.status !== 'syncing' && (
          <button
            onClick={handleClose}
            className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
