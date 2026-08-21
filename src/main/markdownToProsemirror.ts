// Conversor puro: Markdown -> documento ProseMirror (Tiptap). Caminho inverso de notesMarkdown.ts.
// Os nomes de nó e mark seguem exatamente os `case` reconhecidos por prosemirrorToMarkdown.

export interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: PMMark[]
}

export interface PMDoc {
  type: 'doc'
  content: PMNode[]
}

const INLINE = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g

function textNode(text: string, marks?: PMMark[]): PMNode {
  return marks && marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }
}

export function parseInline(line: string): PMNode[] {
  const nodes: PMNode[] = []
  let cursor = 0

  for (const match of line.matchAll(INLINE)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > cursor) nodes.push(textNode(line.slice(cursor, start)))

    if (token.startsWith('`')) {
      nodes.push(textNode(token.slice(1, -1), [{ type: 'code' }]))
    } else if (token.startsWith('[')) {
      const [, text, href] = token.match(/\[([^\]]+)\]\(([^)]+)\)/) as RegExpMatchArray
      nodes.push(textNode(text, [{ type: 'link', attrs: { href } }]))
    } else if (token.startsWith('**')) {
      nodes.push(textNode(token.slice(2, -2), [{ type: 'bold' }]))
    } else {
      nodes.push(textNode(token.slice(1, -1), [{ type: 'italic' }]))
    }

    cursor = start + token.length
  }

  if (cursor < line.length) nodes.push(textNode(line.slice(cursor)))
  return nodes
}

function paragraph(line: string): PMNode {
  return { type: 'paragraph', content: parseInline(line) }
}

export function markdownToProsemirror(markdown: string): PMDoc {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const content: PMNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      index += 1
      continue
    }

    const fence = trimmed.match(/^```(\w*)$/)
    if (fence) {
      const body: string[] = []
      index += 1
      while (index < lines.length && lines[index].trim() !== '```') {
        body.push(lines[index])
        index += 1
      }
      index += 1
      content.push({
        type: 'codeBlock',
        attrs: { language: fence[1] || null },
        content: body.length > 0 ? [{ type: 'text', text: body.join('\n') }] : undefined
      })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      content.push({ type: 'horizontalRule' })
      index += 1
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: parseInline(heading[2])
      })
      index += 1
      continue
    }

    if (trimmed.startsWith('> ')) {
      const body: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        body.push(lines[index].trim().slice(2))
        index += 1
      }
      content.push({ type: 'blockquote', content: body.map(paragraph) })
      continue
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/)
    const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered)
      const items: PMNode[] = []
      while (index < lines.length) {
        const current = lines[index].trim()
        const match = isOrdered ? current.match(/^\d+[.)]\s+(.*)$/) : current.match(/^[-*]\s+(.*)$/)
        if (!match) break
        items.push({ type: 'listItem', content: [paragraph(match[1])] })
        index += 1
      }
      content.push({ type: isOrdered ? 'orderedList' : 'bulletList', content: items })
      continue
    }

    content.push(paragraph(trimmed))
    index += 1
  }

  return { type: 'doc', content }
}
