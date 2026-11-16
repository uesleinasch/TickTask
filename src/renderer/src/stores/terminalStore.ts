import { create } from 'zustand'
import type { TerminalSession, TerminalTabCustomization } from '@shared/types'
import { toast } from '@renderer/components/ui/sonner'
import { readTerminalShell } from '@renderer/lib/terminalPrefs'
import { activatePane, openInSplit, panesAfterRemoval, reconcilePanes } from './terminalPanes'

interface TerminalState {
  sessions: TerminalSession[]
  activeId: string | null
  splitId: string | null
  open: boolean
  maximized: boolean
  refresh: () => Promise<void>
  setOpen: (open: boolean) => void
  toggle: () => void
  toggleMaximized: () => void
  activate: (id: string) => void
  openSplit: (id: string) => void
  splitNew: (taskId: number) => Promise<void>
  closeSplit: () => void
  createSession: (taskId: number) => Promise<boolean>
  toggleForTask: (taskId: number) => Promise<boolean>
  close: (id: string) => Promise<void>
  restart: (id: string) => Promise<void>
  customize: (id: string, patch: TerminalTabCustomization) => Promise<void>
  markExited: (id: string, exitCode: number) => void
  forget: (id: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeId: null,
  splitId: null,
  open: false,
  maximized: false,

  refresh: async () => {
    const sessions = await window.api.terminalList()
    set((state) => ({
      sessions,
      ...reconcilePanes(
        sessions.map((s) => s.id),
        state
      )
    }))
  },

  setOpen: (open) => set(open ? { open } : { open, maximized: false }),

  toggle: () => set((state) => (state.open ? { open: false, maximized: false } : { open: true })),

  toggleMaximized: () => set((state) => ({ open: true, maximized: !state.maximized })),

  activate: (id) => set((state) => ({ ...activatePane(state, id), open: true })),

  openSplit: (id) => set((state) => ({ ...openInSplit(state, id), open: true })),

  splitNew: async (taskId) => {
    const previous = get().activeId
    const created = await get().createSession(taskId)
    const newId = get().activeId
    if (created && previous && newId) set({ activeId: previous, splitId: newId })
  },

  closeSplit: () => set({ splitId: null }),

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
      get().activate(existing.id)
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
    const before = { activeId: get().activeId, splitId: get().splitId }
    await get().close(id)
    const created = await get().createSession(session.taskId)
    const newId = get().activeId
    if (created && newId && before.splitId) {
      set({
        activeId: before.activeId === id ? newId : before.activeId,
        splitId: before.splitId === id ? newId : before.splitId
      })
    }
    if (created && newId && (session.title || session.color || session.icon)) {
      await get().customize(newId, {
        title: session.title,
        color: session.color,
        icon: session.icon
      })
    }
  },

  customize: async (id, patch) => {
    const updated = await window.api.terminalCustomize(id, patch)
    if (!updated) return
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s))
    }))
  },

  markExited: (id, exitCode) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, exitCode, busy: false } : s))
    })),

  forget: (id) =>
    set((state) => {
      if (!state.sessions.some((s) => s.id === id)) return state
      const panes = panesAfterRemoval(
        state.sessions.map((s) => s.id),
        state,
        id
      )
      const sessions = state.sessions.filter((s) => s.id !== id)
      const open = sessions.length > 0 && state.open
      return { sessions, ...panes, open, maximized: open && state.maximized }
    })
}))
