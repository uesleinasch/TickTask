// Conversor puro: documento ProseMirror (Tiptap) -> Markdown (GitHub-flavored).
// Sem I/O; testável isoladamente. Imagens são resolvidas para um caminho relativo.

interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}
interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: PMMark[]
}

export type MarkdownImageResolver = (assetId: string) => string

function applyMarks(text: string, marks: PMMark[] | undefined): string {
  if (!marks || !marks.length) return text
  const has = (t: string): boolean => marks.some((m) => m.type === t)
  // Código inline não combina com outras marcações.
  if (has('code')) return '`' + text + '`'
  let s = text
  if (has('strike')) s = `~~${s}~~`
  if (has('italic')) s = `*${s}*`
  if (has('bold')) s = `**${s}**`
  if (has('highlight')) s = `==${s}==`
  if (has('underline')) s = `<u>${s}</u>`
  const link = marks.find((m) => m.type === 'link')
  if (link) s = `[${s}](${String(link.attrs?.href ?? '')})`
  return s
}

function renderInline(nodes: PMNode[] | undefined): string {
  let out = ''
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      out += '\n'
      continue
    }
    if (node.type === 'mention') {
      out += '@' + String(node.attrs?.label ?? '')
      continue
    }
    if (node.type !== 'text') continue
    out += applyMarks(String(node.text ?? ''), node.marks)
  }
  return out
}

function firstParagraphInline(node: PMNode): PMNode[] {
  const para = (node.content ?? []).find((c) => c.type === 'paragraph')
  return para?.content ?? []
}

function listToMarkdown(node: PMNode, ordered: boolean): string {
  const items = (node.content ?? []).filter((c) => c.type === 'listItem')
  return items
    .map((li, i) => (ordered ? `${i + 1}. ` : '- ') + renderInline(firstParagraphInline(li)))
    .join('\n')
}

function taskListToMarkdown(node: PMNode): string {
  const items = (node.content ?? []).filter((c) => c.type === 'taskItem')
  return items
    .map((ti) => `- ${ti.attrs?.checked ? '[x]' : '[ ]'} ` + renderInline(firstParagraphInline(ti)))
    .join('\n')
}

function cellText(cell: PMNode): string {
  return renderInline(firstParagraphInline(cell)).replace(/\n/g, ' ').replace(/\|/g, '\\|')
}

function tableToMarkdown(node: PMNode): string {
  const rows = (node.content ?? []).filter((r) => r.type === 'tableRow')
  if (!rows.length) return ''
  const width = (rows[0].content ?? []).length
  const lines: string[] = []
  rows.forEach((row, i) => {
    const cells = (row.content ?? []).map(cellText)
    while (cells.length < width) cells.push('')
    lines.push('| ' + cells.join(' | ') + ' |')
    if (i === 0) lines.push('| ' + Array(width).fill('---').join(' | ') + ' |')
  })
  return lines.join('\n')
}

function blockToMarkdown(node: PMNode, resolveImage: MarkdownImageResolver): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content)
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)))
      return '#'.repeat(level) + ' ' + renderInline(node.content)
    }
    case 'bulletList':
      return listToMarkdown(node, false)
    case 'orderedList':
      return listToMarkdown(node, true)
    case 'taskList':
      return taskListToMarkdown(node)
    case 'blockquote':
      return (node.content ?? [])
        .filter((c) => c.type === 'paragraph')
        .map((c) => '> ' + renderInline(c.content))
        .join('\n')
    case 'codeBlock': {
      const text = (node.content ?? []).map((c) => String(c.text ?? '')).join('')
      const lang = String(node.attrs?.language ?? '')
      return '```' + lang + '\n' + text + '\n```'
    }
    case 'horizontalRule':
      return '---'
    case 'table':
      return tableToMarkdown(node)
    case 'image': {
      const alt = String(node.attrs?.alt ?? '')
      const assetId = String(node.attrs?.assetId ?? '')
      const src = assetId ? resolveImage(assetId) : String(node.attrs?.src ?? '')
      return `![${alt}](${src})`
    }
    default:
      return ''
  }
}

const defaultResolver: MarkdownImageResolver = (id) => `assets/${id}`

export function prosemirrorToMarkdown(
  json: string | null | undefined,
  resolveImage: MarkdownImageResolver = defaultResolver
): string {
  if (!json) return ''
  let doc: PMNode
  try {
    doc = JSON.parse(json) as PMNode
  } catch {
    return ''
  }
  if (!doc || doc.type !== 'doc') return ''
  return (doc.content ?? [])
    .map((n) => blockToMarkdown(n, resolveImage))
    .filter((s) => s.length > 0)
    .join('\n\n')
}
