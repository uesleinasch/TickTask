export const NOTEBOOKS_ROOT_TITLE = 'Cadernos TickTask'

const TITLE_LIMIT = 2000

export interface RemotePage {
  archived: boolean
  parentId: string | null
}

export type PageAction = 'create' | 'update' | 'recreate'

export function sameNotionId(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const norm = (id: string): string => id.replace(/-/g, '').toLowerCase()
  return norm(a) === norm(b)
}

/**
 * O SDK v4 não move página entre pais: se o pai no Notion não é mais o esperado, a página antiga é
 * arquivada e outra é criada no lugar certo.
 */
export function planPageTarget(remote: RemotePage | null, expectedParentId: string): PageAction {
  if (!remote || remote.archived) return 'create'
  return sameNotionId(remote.parentId, expectedParentId) ? 'update' : 'recreate'
}

/** Blocos do corpo a apagar antes de reescrever: subpáginas também são blocos e iriam junto. */
export function bodyBlockIdsToDelete(blocks: { id: string; type: string }[]): string[] {
  return blocks
    .filter((b) => b.type !== 'child_page' && b.type !== 'child_database')
    .map((b) => b.id)
}

export function titleProperty(
  title: string,
  fallback: string
): {
  title: { text: { content: string } }[]
} {
  const content = (title.trim() || fallback).slice(0, TITLE_LIMIT)
  return { title: [{ text: { content } }] }
}
