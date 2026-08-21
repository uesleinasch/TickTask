export interface NamedRow {
  id: number
  name: string
}

export type ResolveResult =
  | { ok: true; id: number }
  | { ok: false; code: 'not_found' | 'ambiguous'; candidates: string[] }

export function resolveByName(rows: NamedRow[], input: string | number): ResolveResult {
  if (typeof input === 'number') return { ok: true, id: input }

  const needle = input.trim()
  const exact = rows.filter((row) => row.name === needle)
  if (exact.length === 1) return { ok: true, id: exact[0].id }

  const loose = rows.filter((row) => row.name.toLowerCase() === needle.toLowerCase())
  if (loose.length === 1) return { ok: true, id: loose[0].id }
  if (loose.length > 1) {
    return { ok: false, code: 'ambiguous', candidates: loose.map((row) => row.name) }
  }

  return { ok: false, code: 'not_found', candidates: rows.map((row) => row.name) }
}
