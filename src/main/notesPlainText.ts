interface PMNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'codeBlock',
  'blockquote',
  'listItem',
  'taskItem',
  'tableCell',
  'tableHeader',
  'horizontalRule'
])

/** Texto corrido de uma nota ProseMirror, para busca. Nota legada (Editor.js) ou inválida vira ''. */
export function notesPlainText(raw: string | null | undefined): string {
  if (!raw) return ''
  let doc: PMNode
  try {
    doc = JSON.parse(raw) as PMNode
  } catch {
    return ''
  }
  if (doc?.type !== 'doc') return ''

  const parts: string[] = []
  const walk = (node: PMNode): void => {
    if (node.type === 'text' && node.text) parts.push(node.text)
    else if (node.type === 'mention') parts.push(`@${String(node.attrs?.label ?? '')}`)
    else if (node.type === 'hardBreak') parts.push('\n')
    node.content?.forEach(walk)
    if (node.type && BLOCK_TYPES.has(node.type)) parts.push('\n')
  }
  walk(doc)
  return parts
    .join('')
    .replace(/[ \t]*\n[\s]*/g, '\n')
    .trim()
}

/** Trecho em volta da primeira ocorrência de `query`, numa linha só. */
export function searchSnippet(text: string, query: string, radius = 60): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const needle = query.trim().toLowerCase()
  if (!flat || !needle) return ''
  const at = flat.toLowerCase().indexOf(needle)
  if (at < 0) return ''
  const start = Math.max(0, at - radius)
  const end = Math.min(flat.length, at + needle.length + radius)
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`
}
