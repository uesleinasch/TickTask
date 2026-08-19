export type NotesViewMode = 'normal' | 'maximized' | 'zen'

export const MIN_NOTES_WIDTH = 360
export const MIN_DETAILS_SPACE = 700
export const DEFAULT_NOTES_WIDTH = 550
export const DEFAULT_ZEN_WIDTH = 640

export function clampNotesWidth(desired: number, viewportWidth: number): number {
  if (!Number.isFinite(desired)) return MIN_NOTES_WIDTH
  const max = Math.max(MIN_NOTES_WIDTH, Math.round(viewportWidth - MIN_DETAILS_SPACE))
  return Math.min(Math.max(Math.round(desired), MIN_NOTES_WIDTH), max)
}
