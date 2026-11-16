export const MAX_PAGE_DEPTH = 2

export const UNTITLED_PAGE = 'Página sem título'

export interface PageNode {
  id: number
  parent_page_id: number | null
  position: number
}

export interface FlatPage<T extends PageNode> {
  page: T
  depth: number
}

export interface PagePlacement {
  parent_page_id: number | null
  index: number
}

function byPosition(a: PageNode, b: PageNode): number {
  return a.position - b.position || a.id - b.id
}

function childrenMap<T extends PageNode>(pages: T[]): Map<number | null, T[]> {
  const ids = new Set(pages.map((p) => p.id))
  const map = new Map<number | null, T[]>()
  for (const page of pages) {
    const key =
      page.parent_page_id !== null && ids.has(page.parent_page_id) ? page.parent_page_id : null
    const list = map.get(key)
    if (list) list.push(page)
    else map.set(key, [page])
  }
  for (const list of map.values()) list.sort(byPosition)
  return map
}

export function flattenPageTree<T extends PageNode>(pages: T[]): FlatPage<T>[] {
  const children = childrenMap(pages)
  const out: FlatPage<T>[] = []
  const visit = (parent: number | null, depth: number): void => {
    for (const page of children.get(parent) ?? []) {
      out.push({ page, depth })
      visit(page.id, depth + 1)
    }
  }
  visit(null, 0)
  return out
}

export function siblingsOf<T extends PageNode>(pages: T[], parentId: number | null): T[] {
  return childrenMap(pages).get(parentId) ?? []
}

export function pageDepth(pages: PageNode[], id: number): number {
  const byId = new Map(pages.map((p) => [p.id, p]))
  let depth = 0
  let current = byId.get(id)
  while (current?.parent_page_id != null && byId.has(current.parent_page_id)) {
    depth++
    if (depth > pages.length) break
    current = byId.get(current.parent_page_id)
  }
  return depth
}

export function subtreeIds(pages: PageNode[], id: number): number[] {
  const children = childrenMap(pages)
  const out: number[] = []
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop() as number
    if (out.includes(current)) continue
    out.push(current)
    for (const child of children.get(current) ?? []) stack.push(child.id)
  }
  return out
}

export function subtreeHeight(pages: PageNode[], id: number): number {
  const children = childrenMap(pages)
  const height = (current: number, guard: number): number => {
    if (guard > pages.length) return 0
    const kids = children.get(current) ?? []
    return kids.length === 0 ? 0 : 1 + Math.max(...kids.map((k) => height(k.id, guard + 1)))
  }
  return height(id, 0)
}

/** Diz se a página `id` (com a subárvore) pode ficar sob `parentId` sem passar do limite. */
export function canPlaceUnder(pages: PageNode[], id: number, parentId: number | null): boolean {
  const height = subtreeHeight(pages, id)
  if (parentId === null) return height <= MAX_PAGE_DEPTH
  if (subtreeIds(pages, id).includes(parentId)) return false
  return pageDepth(pages, parentId) + 1 + height <= MAX_PAGE_DEPTH
}

/** Destino de arrastar `activeId` para a linha `overId` da lista achatada: vira irmã de `overId`. */
export function dropPlacement(
  pages: PageNode[],
  activeId: number,
  overId: number
): PagePlacement | null {
  if (activeId === overId) return null
  if (subtreeIds(pages, activeId).includes(overId)) return null
  const flat = flattenPageTree(pages)
  const activeIndex = flat.findIndex((f) => f.page.id === activeId)
  const overIndex = flat.findIndex((f) => f.page.id === overId)
  const over = flat[overIndex]?.page
  if (activeIndex < 0 || !over) return null

  const siblings = siblingsOf(pages, over.parent_page_id).filter((p) => p.id !== activeId)
  const at = siblings.findIndex((p) => p.id === overId)
  return {
    parent_page_id: over.parent_page_id,
    index: activeIndex < overIndex ? at + 1 : at
  }
}

/** Torna a página subpágina da irmã anterior (vai para o fim dos filhos dela). */
export function indentPlacement(pages: PageNode[], id: number): PagePlacement | null {
  const page = pages.find((p) => p.id === id)
  if (!page) return null
  const siblings = siblingsOf(pages, page.parent_page_id)
  const previous = siblings[siblings.findIndex((p) => p.id === id) - 1]
  if (!previous) return null
  return { parent_page_id: previous.id, index: siblingsOf(pages, previous.id).length }
}

/** Sobe a página um nível: passa a ser irmã do pai, logo depois dele. */
export function outdentPlacement(pages: PageNode[], id: number): PagePlacement | null {
  const page = pages.find((p) => p.id === id)
  const parent = page && pages.find((p) => p.id === page.parent_page_id)
  if (!parent) return null
  const siblings = siblingsOf(pages, parent.parent_page_id).filter((p) => p.id !== id)
  return {
    parent_page_id: parent.parent_page_id,
    index: siblings.findIndex((p) => p.id === parent.id) + 1
  }
}
