export interface PaneIds {
  activeId: string | null
  splitId: string | null
}

export function reconcilePanes(ids: string[], panes: PaneIds): PaneIds {
  const valid = (id: string | null): string | null => (id && ids.includes(id) ? id : null)
  const activeId = valid(panes.activeId) ?? valid(panes.splitId) ?? ids[0] ?? null
  const splitId = valid(panes.splitId)
  return { activeId, splitId: splitId === activeId ? null : splitId }
}

export function panesAfterRemoval(ids: string[], panes: PaneIds, removedId: string): PaneIds {
  if (removedId === panes.splitId) return { activeId: panes.activeId, splitId: null }
  if (removedId !== panes.activeId) return panes
  if (panes.splitId) return { activeId: panes.splitId, splitId: null }
  const index = ids.indexOf(removedId)
  const rest = ids.filter((id) => id !== removedId)
  return { activeId: rest[Math.min(index, rest.length - 1)] ?? null, splitId: null }
}

export function activatePane(panes: PaneIds, id: string): PaneIds {
  return id === panes.splitId ? panes : { ...panes, activeId: id }
}

export function openInSplit(panes: PaneIds, id: string): PaneIds {
  return id === panes.activeId ? panes : { ...panes, splitId: id }
}
