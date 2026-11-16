import type { NotesOwner } from '@shared/types'

export function saveOwnerNotes(owner: NotesOwner, notes: string): Promise<void> {
  return owner.kind === 'page'
    ? window.api.savePageNotes(owner.id, notes)
    : window.api.updateTaskNotes(owner.id, notes)
}

export function saveOwnerDrawing(
  owner: NotesOwner,
  drawing: string,
  preview: Uint8Array | null
): Promise<void> {
  return owner.kind === 'page'
    ? window.api.savePageDrawing(owner.id, drawing, preview)
    : window.api.saveDrawing(owner.id, drawing, preview)
}
