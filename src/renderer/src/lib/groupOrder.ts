export function applyGroupOrder<T extends { key: string }>(groups: T[], order: string[]): T[] {
  if (order.length === 0) return groups
  const rank = new Map(order.map((key, index) => [key, index]))
  return groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => {
      const ra = rank.get(a.group.key)
      const rb = rank.get(b.group.key)
      if (ra !== undefined && rb !== undefined) return ra - rb
      if (ra !== undefined) return -1
      if (rb !== undefined) return 1
      return a.index - b.index
    })
    .map(({ group }) => group)
}

export function moveGroupKey(
  order: string[],
  visibleKeys: string[],
  activeKey: string,
  overKey: string
): string[] {
  const full = [...order, ...visibleKeys.filter((key) => !order.includes(key))]
  const from = full.indexOf(activeKey)
  const to = full.indexOf(overKey)
  if (from === -1 || to === -1 || from === to) return full
  const next = [...full]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
