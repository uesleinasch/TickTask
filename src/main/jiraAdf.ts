export interface DocNode {
  type: string
  version?: number
  attrs?: Record<string, unknown>
  content?: DocNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

const MEDIA_MARKER = /^\s*🖼\s*jira-media:([\w-]+)\s*$/

export function mediaMarkerText(id: string): string {
  return `🖼 jira-media:${id}`
}

export function isEmptyDoc(doc: DocNode | null | undefined): boolean {
  if (!doc) return true
  const hasText = (node: DocNode): boolean =>
    (node.type === 'text' && !!node.text?.trim()) ||
    ['image', 'mention', 'horizontalRule', 'rule', 'mediaSingle', 'mediaGroup'].includes(
      node.type
    ) ||
    (node.content ?? []).some(hasText)
  return !hasText(doc)
}

export function parseDoc(json: string | null | undefined): DocNode | null {
  if (!json) return null
  try {
    const doc = JSON.parse(json) as DocNode
    return doc?.type === 'doc' ? doc : null
  } catch {
    return null
  }
}

// ---------- ADF -> ProseMirror ----------

const ADF_TO_PM_MARK: Record<string, string> = {
  strong: 'bold',
  em: 'italic',
  strike: 'strike',
  code: 'code',
  underline: 'underline',
  link: 'link'
}

function adfMarks(marks: DocNode['marks']): DocNode['marks'] {
  const out = (marks ?? []).flatMap((mark) => {
    const type = ADF_TO_PM_MARK[mark.type]
    if (!type) return []
    return type === 'link'
      ? [{ type, attrs: { href: String(mark.attrs?.href ?? '') } }]
      : [{ type }]
  })
  return out.length ? out : undefined
}

function pmText(text: string, marks?: DocNode['marks']): DocNode[] {
  if (!text) return []
  return [marks?.length ? { type: 'text', text, marks } : { type: 'text', text }]
}

function adfInline(nodes: DocNode[] | undefined): DocNode[] {
  return (nodes ?? []).flatMap((node): DocNode[] => {
    switch (node.type) {
      case 'text':
        return pmText(node.text ?? '', adfMarks(node.marks))
      case 'hardBreak':
        return [{ type: 'hardBreak' }]
      case 'mention': {
        const label = String(node.attrs?.text ?? '')
        return pmText(label.startsWith('@') ? label : `@${label}`)
      }
      case 'emoji':
        return pmText(String(node.attrs?.text ?? node.attrs?.shortName ?? ''))
      case 'inlineCard': {
        const url = String(node.attrs?.url ?? '')
        return pmText(url, [{ type: 'link', attrs: { href: url } }])
      }
      case 'date': {
        const ms = Number(node.attrs?.timestamp)
        return Number.isFinite(ms) ? pmText(new Date(ms).toISOString().slice(0, 10)) : []
      }
      case 'status':
        return pmText(String(node.attrs?.text ?? ''))
      default:
        return adfInline(node.content)
    }
  })
}

function paragraph(content: DocNode[]): DocNode {
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

function firstMediaId(node: DocNode): string | null {
  for (const child of node.content ?? []) {
    if (child.type === 'media' && child.attrs?.id) return String(child.attrs.id)
  }
  return null
}

function adfTaskList(node: DocNode): DocNode {
  const items: DocNode[] = []
  for (const child of node.content ?? []) {
    if (child.type === 'taskItem') {
      items.push({
        type: 'taskItem',
        attrs: { checked: child.attrs?.state === 'DONE' },
        content: [paragraph(adfInline(child.content))]
      })
    } else if (child.type === 'taskList') {
      const previous = items[items.length - 1]
      if (previous) previous.content = [...(previous.content ?? []), adfTaskList(child)]
      else items.push(...(adfTaskList(child).content ?? []))
    }
  }
  return { type: 'taskList', content: items }
}

function blocksOrParagraph(nodes: DocNode[] | undefined): DocNode[] {
  const blocks = adfBlocks(nodes)
  return blocks.length ? blocks : [paragraph([])]
}

function adfBlocks(nodes: DocNode[] | undefined): DocNode[] {
  return (nodes ?? []).flatMap((node): DocNode[] => {
    switch (node.type) {
      case 'paragraph':
        return [paragraph(adfInline(node.content))]
      case 'heading':
        return [
          {
            type: 'heading',
            attrs: { level: Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1))) },
            content: adfInline(node.content)
          }
        ]
      case 'bulletList':
        return [{ type: 'bulletList', content: adfListItems(node.content) }]
      case 'orderedList':
        return [
          {
            type: 'orderedList',
            attrs: { start: Number(node.attrs?.order ?? 1) },
            content: adfListItems(node.content)
          }
        ]
      case 'taskList':
        return [adfTaskList(node)]
      case 'decisionList':
        return [
          {
            type: 'bulletList',
            content: (node.content ?? []).map((item) => ({
              type: 'listItem',
              content: [paragraph(adfInline(item.content))]
            }))
          }
        ]
      case 'blockquote':
      case 'panel':
        return [{ type: 'blockquote', content: blocksOrParagraph(node.content) }]
      case 'codeBlock': {
        const text = (node.content ?? []).map((c) => c.text ?? '').join('')
        const language = node.attrs?.language ? String(node.attrs.language) : null
        return [{ type: 'codeBlock', attrs: { language }, content: pmText(text) }]
      }
      case 'rule':
        return [{ type: 'horizontalRule' }]
      case 'table':
        return [{ type: 'table', content: (node.content ?? []).map(adfTableRow) }]
      case 'mediaSingle':
      case 'mediaGroup': {
        const id = firstMediaId(node)
        return id ? [paragraph(pmText(mediaMarkerText(id)))] : []
      }
      case 'blockCard':
      case 'embedCard': {
        const url = String(node.attrs?.url ?? '')
        return url ? [paragraph(pmText(url, [{ type: 'link', attrs: { href: url } }]))] : []
      }
      case 'expand':
      case 'nestedExpand': {
        const title = String(node.attrs?.title ?? '')
        const heading = title ? [paragraph(pmText(title, [{ type: 'bold' }]))] : []
        return [...heading, ...adfBlocks(node.content)]
      }
      default:
        return adfBlocks(node.content)
    }
  })
}

function adfListItems(nodes: DocNode[] | undefined): DocNode[] {
  return (nodes ?? [])
    .filter((n) => n.type === 'listItem')
    .map((item) => ({ type: 'listItem', content: blocksOrParagraph(item.content) }))
}

function adfTableRow(row: DocNode): DocNode {
  return {
    type: 'tableRow',
    content: (row.content ?? []).map((cell) => ({
      type: cell.type === 'tableHeader' ? 'tableHeader' : 'tableCell',
      attrs: {
        colspan: Number(cell.attrs?.colspan ?? 1),
        rowspan: Number(cell.attrs?.rowspan ?? 1),
        colwidth: Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth : null
      },
      content: blocksOrParagraph(cell.content)
    }))
  }
}

export function adfToProsemirror(adf: DocNode | null | undefined): DocNode {
  return { type: 'doc', content: blocksOrParagraph(adf?.content) }
}

// ---------- ProseMirror -> ADF ----------

const PM_TO_ADF_MARK: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  strike: 'strike',
  code: 'code',
  underline: 'underline',
  link: 'link'
}

function pmMarks(marks: DocNode['marks']): DocNode['marks'] {
  let out = (marks ?? []).flatMap((mark) => {
    const type = PM_TO_ADF_MARK[mark.type]
    if (!type) return []
    return type === 'link'
      ? [{ type, attrs: { href: String(mark.attrs?.href ?? '') } }]
      : [{ type }]
  })
  if (out.some((m) => m.type === 'code'))
    out = out.filter((m) => m.type === 'code' || m.type === 'link')
  return out.length ? out : undefined
}

function adfText(text: string, marks?: DocNode['marks']): DocNode[] {
  if (!text) return []
  return [marks?.length ? { type: 'text', text, marks } : { type: 'text', text }]
}

function pmInline(nodes: DocNode[] | undefined): DocNode[] {
  return (nodes ?? []).flatMap((node): DocNode[] => {
    if (node.type === 'text') return adfText(node.text ?? '', pmMarks(node.marks))
    if (node.type === 'hardBreak') return [{ type: 'hardBreak' }]
    if (node.type === 'mention') return adfText(`@${String(node.attrs?.label ?? '')}`)
    return pmInline(node.content)
  })
}

function plainText(node: DocNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(plainText).join('')
}

interface PmToAdfContext {
  media: Map<string, DocNode>
  nextId: () => string
}

const LIST_ITEM_CHILDREN = new Set(['paragraph', 'bulletList', 'orderedList', 'codeBlock'])
const QUOTE_CHILDREN = new Set(['paragraph', 'bulletList', 'orderedList', 'codeBlock'])

function restrictTo(blocks: DocNode[], allowed: Set<string>): DocNode[] {
  return blocks.flatMap((block): DocNode[] => {
    if (allowed.has(block.type)) return [block]
    if (block.type === 'heading') return [{ type: 'paragraph', content: block.content }]
    if (block.content?.length) return restrictTo(block.content, allowed)
    return []
  })
}

function adfParagraph(content: DocNode[]): DocNode {
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

function pmTaskItems(node: DocNode, ctx: PmToAdfContext): DocNode[] {
  const out: DocNode[] = []
  for (const item of node.content ?? []) {
    if (item.type !== 'taskItem') continue
    const inline: DocNode[] = []
    const nested: DocNode[] = []
    for (const child of item.content ?? []) {
      if (child.type === 'taskList') nested.push(pmTaskList(child, ctx))
      else {
        if (inline.length && child.type === 'paragraph') inline.push({ type: 'hardBreak' })
        inline.push(...pmInline(child.content))
      }
    }
    out.push({
      type: 'taskItem',
      attrs: { localId: ctx.nextId(), state: item.attrs?.checked ? 'DONE' : 'TODO' },
      ...(inline.length ? { content: inline } : {})
    })
    out.push(...nested)
  }
  return out
}

function pmTaskList(node: DocNode, ctx: PmToAdfContext): DocNode {
  return { type: 'taskList', attrs: { localId: ctx.nextId() }, content: pmTaskItems(node, ctx) }
}

function pmListItems(nodes: DocNode[] | undefined, ctx: PmToAdfContext): DocNode[] {
  return (nodes ?? [])
    .filter((n) => n.type === 'listItem')
    .map((item) => {
      const content = restrictTo(pmBlocks(item.content, ctx), LIST_ITEM_CHILDREN)
      if (content[0]?.type !== 'paragraph') content.unshift({ type: 'paragraph' })
      return { type: 'listItem', content }
    })
}

function pmCellBlocks(nodes: DocNode[] | undefined, ctx: PmToAdfContext): DocNode[] {
  const blocks = pmBlocks(nodes, ctx)
  return blocks.length ? blocks : [{ type: 'paragraph' }]
}

function pmBlocks(nodes: DocNode[] | undefined, ctx: PmToAdfContext): DocNode[] {
  return (nodes ?? []).flatMap((node): DocNode[] => {
    switch (node.type) {
      case 'paragraph': {
        const marker = MEDIA_MARKER.exec(plainText(node))
        if (marker) {
          const media = ctx.media.get(marker[1])
          return media ? [media] : []
        }
        return [adfParagraph(pmInline(node.content))]
      }
      case 'heading':
        return [
          {
            type: 'heading',
            attrs: { level: Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1))) },
            ...(node.content?.length ? { content: pmInline(node.content) } : {})
          }
        ]
      case 'bulletList':
        return [{ type: 'bulletList', content: pmListItems(node.content, ctx) }]
      case 'orderedList':
        return [
          {
            type: 'orderedList',
            attrs: { order: Number(node.attrs?.start ?? 1) },
            content: pmListItems(node.content, ctx)
          }
        ]
      case 'taskList':
        return [pmTaskList(node, ctx)]
      case 'blockquote': {
        const content = restrictTo(pmBlocks(node.content, ctx), QUOTE_CHILDREN)
        return [{ type: 'blockquote', content: content.length ? content : [{ type: 'paragraph' }] }]
      }
      case 'codeBlock': {
        const language = node.attrs?.language ? { language: String(node.attrs.language) } : null
        return [
          {
            type: 'codeBlock',
            ...(language ? { attrs: language } : {}),
            content: adfText(plainText(node))
          }
        ]
      }
      case 'horizontalRule':
        return [{ type: 'rule' }]
      case 'table':
        return [
          {
            type: 'table',
            content: (node.content ?? []).map((row) => ({
              type: 'tableRow',
              content: (row.content ?? []).map((cell) => {
                const colwidth = cell.attrs?.colwidth
                return {
                  type: cell.type === 'tableHeader' ? 'tableHeader' : 'tableCell',
                  attrs: {
                    colspan: Number(cell.attrs?.colspan ?? 1),
                    rowspan: Number(cell.attrs?.rowspan ?? 1),
                    ...(Array.isArray(colwidth) ? { colwidth } : {})
                  },
                  content: pmCellBlocks(cell.content, ctx)
                }
              })
            }))
          }
        ]
      case 'image':
        return []
      default:
        return pmBlocks(node.content, ctx)
    }
  })
}

export function collectAdfMedia(adf: DocNode | null | undefined): Map<string, DocNode> {
  const media = new Map<string, DocNode>()
  const walk = (node: DocNode): void => {
    if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
      const id = firstMediaId(node)
      if (id) media.set(id, node)
      return
    }
    node.content?.forEach(walk)
  }
  if (adf) walk(adf)
  return media
}

export function prosemirrorToAdf(
  doc: DocNode | null | undefined,
  media: Map<string, DocNode> = new Map()
): DocNode {
  let counter = 0
  const ctx: PmToAdfContext = { media, nextId: () => `tt-${++counter}` }
  return { type: 'doc', version: 1, content: pmBlocks(doc?.content, ctx) }
}

export function adfToPlainText(adf: DocNode | null | undefined): string {
  if (!adf) return ''
  const blocks = (adf.content ?? []).map((block) =>
    (block.content ?? [])
      .map((n) =>
        n.type === 'hardBreak' ? '\n' : n.type === 'text' ? (n.text ?? '') : plainText(n)
      )
      .join('')
  )
  return blocks.join('\n')
}

export function plainTextToAdf(text: string): DocNode {
  const content = text.split('\n').map((line) => adfParagraph(adfText(line)))
  return { type: 'doc', version: 1, content }
}
