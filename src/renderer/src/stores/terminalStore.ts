import { create } from 'zustand'
import type { TerminalSession } from '@shared/types'
import { toast } from '@renderer/components/ui/sonner'
import { readTerminalShell } from '@renderer/lib/terminalPrefs'

interface TerminalState {
  sessions: TerminalSession[]
  activeId: string | null
  open: boolean
  maximized: boolean
  refresh: () => Promise<void>
  setOpen: (open: boolean) => void
  toggle: () => void
  toggleMaximized: () => void
  activate: (id: string) => void
  createSession: (taskId: number) => Promise<boolean>
  toggleForTask: (taskId: number) => Promise<boolean>
  close: (id: string) => Promise<void>
  restart: (id: string) => Promise<void>
  markExited: (id: string, exitCode: number) => void
  forget: (id: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeId: null,
  open: false,
  maximized: false,

  refresh: async () => {
    const sessions = await window.api.terminalList()
    set((state) => ({
      sessions,
      activeId: sessions.some((s) => s.id === state.activeId)
        ? state.activeId
        : (sessions[0]?.id ?? null)
    }))
  },

  setOpen: (open) => set(open ? { open } : { open, maximized: false }),

  toggle: () => set((state) => (state.open ? { open: false, maximized: false } : { open: true })),

  toggleMaximized: () => set((state) => ({ open: true, maximized: !state.maximized })),

  activate: (id) => set({ activeId: id, open: true }),

  createSession: async (taskId) => {
    const result = await window.api.terminalCreate(taskId, { shell: readTerminalShell() })
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    if (result.shellFallback) {
      toast.warning(`Shell configurado não encontrado; usando ${result.session.shell}`)
    }
    set((state) => ({
      sessions: [...state.sessions, result.session],
      activeId: result.session.id,
      open: true
    }))
    return true
  },

  toggleForTask: async (taskId) => {
    const { sessions, activeId, open } = get()
    const active = sessions.find((s) => s.id === activeId)
    if (open && active?.taskId === taskId) {
      set({ open: false, maximized: false })
      return true
    }
    const existing = sessions.find((s) => s.taskId === taskId)
    if (existing) {
      set({ activeId: existing.id, open: true })
      return true
    }
    return get().createSession(taskId)
  },

  close: async (id) => {
    await window.api.terminalDispose(id)
    get().forget(id)
  },

  restart: async (id) => {
    const session = get().sessions.find((s) => s.id === id)
    if (!session) return
    await get().close(id)
    await get().createSession(session.taskId)
  },

  markExited: (id, exitCode) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, exitCode, busy: false } : s))
    })),

  forget: (id) =>
    set((state) => {
      const index = state.sessions.findIndex((s) => s.id === id)
      if (index === -1) return state
      const sessions = state.sessions.filter((s) => s.id !== id)
      const activeId =
        state.activeId === id
          ? (sessions[Math.min(index, sessions.length - 1)]?.id ?? null)
          : state.activeId
      const open = sessions.length > 0 && state.open
      return { sessions, activeId, open, maximized: open && state.maximized }
    })
}))
