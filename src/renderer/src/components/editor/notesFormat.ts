import type { JSONContent } from '@tiptap/core'

interface EditorJsBlock {
  type: string
  data: Record<string, unknown>
}
export interface EditorJsData {
  blocks?: EditorJsBlock[]
}

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

/** Converte o HTML inline do Editor.js em nós inline do ProseMirror. */
function inlineFromHtml(html: string): JSONContent[] {
  if (!html) return []
  const nodes: JSONContent[] = []
  const state = { bold: 0, italic: 0, underline: 0, strike: 0, code: 0, mark: 0 }
  let linkUrl: string | null = null

  const pushText = (raw: string): void => {
    const content = decodeEntities(raw)
    if (!content) return
    const marks: NonNullable<JSONContent['marks']> = []
    if (state.bold > 0) marks.push({ type: 'bold' })
    if (state.italic > 0) marks.push({ type: 'italic' })
    if (state.underline > 0) marks.push({ type: 'underline' })
    if (state.strike > 0) marks.push({ type: 'strike' })
    if (state.code > 0) marks.push({ type: 'code' })
    if (state.mark > 0) marks.push({ type: 'highlight' })
    if (linkUrl) marks.push({ type: 'link', attrs: { href: linkUrl } })
    nodes.push(
      marks.length ? { type: 'text', text: content, marks } : { type: 'text', text: content }
    )
  }

  const tagRegex = /<\/?([a-zA-Z0-9]+)([^>]*)>/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(html)) !== null) {
    pushText(html.slice(lastIndex, match.index))
    lastIndex = tagRegex.lastIndex
    const full = match[0]
    const tag = match[1].toLowerCase()
    const isClosing = full.startsWith('</')
    switch (tag) {
      case 'b':
      case 'strong':
        state.bold += isClosing ? -1 : 1
        break
      case 'i':
      case 'em':
        state.italic += isClosing ? -1 : 1
        break
      case 'u':
        state.underline += isClosing ? -1 : 1
        break
      case 's':
      case 'del':
        state.strike += isClosing ? -1 : 1
        break
      case 'code':
        state.code += isClosing ? -1 : 1
        break
      case 'mark':
        state.mark += isClosing ? -1 : 1
        break
      case 'a':
        if (isClosing) linkUrl = null
        else {
          const href = match[2].match(/href\s*=\s*["']([^"']*)["']/i)
          linkUrl = href ? href[1] : null
        }
        break
      case 'br':
        nodes.push({ type: 'hardBreak' })
        break
      default:
        break
    }
  }
  pushText(html.slice(lastIndex))
  return nodes
}

function paragraph(inline: JSONContent[]): JSONContent {
  return inline.length ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
}

function taskItem(text: string, checked: boolean): JSONContent {
  return { type: 'taskItem', attrs: { checked }, content: [paragraph(inlineFromHtml(text))] }
}

function listItem(text: string): JSONContent {
  return { type: 'listItem', content: [paragraph(inlineFromHtml(text))] }
}

function itemText(item: unknown): string {
  if (typeof item === 'string') return item
  const obj = item as { content?: string; text?: string }
  return String(obj?.content ?? obj?.text ?? '')
}

function itemChecked(item: unknown): boolean {
  const obj = item as { meta?: { checked?: boolean }; checked?: boolean }
  return typeof item === 'object' && item !== null
    ? Boolean(obj?.meta?.checked ?? obj?.checked)
    : false
}

function listFromEditorJs(data: Record<string, unknown>): JSONContent {
  const style = data.style
  const items = (data.items ?? []) as unknown[]
  if (style === 'checklist') {
    return { type: 'taskList', content: items.map((it) => taskItem(itemText(it), itemChecked(it))) }
  }
  const type = style === 'ordered' ? 'orderedList' : 'bulletList'
  return { type, content: items.map((it) => listItem(itemText(it))) }
}

export function editorJsToProseMirror(data: EditorJsData): JSONContent {
  const content: JSONContent[] = []
  for (const block of data.blocks ?? []) {
    const d = block.data ?? {}
    switch (block.type) {
      case 'paragraph':
        content.push(paragraph(inlineFromHtml(String(d.text ?? ''))))
        break
      case 'header': {
        const level = Math.min(3, Math.max(1, Number(d.level ?? 2)))
        content.push({
          type: 'heading',
          attrs: { level },
          content: inlineFromHtml(String(d.text ?? ''))
        })
        break
      }
      case 'list':
        content.push(listFromEditorJs(d))
        break
      case 'checklist': {
        const items = (d.items ?? []) as Array<{ text?: string; checked?: boolean }>
        content.push({
          type: 'taskList',
          content: items.map((it) => taskItem(String(it?.text ?? ''), Boolean(it?.checked)))
        })
        break
      }
      case 'quote':
        content.push({
          type: 'blockquote',
          content: [paragraph(inlineFromHtml(String(d.text ?? '')))]
        })
        break
      case 'code':
        content.push({
          type: 'codeBlock',
          content: String(d.code ?? '') ? [{ type: 'text', text: String(d.code ?? '') }] : []
        })
        break
      case 'delimiter':
        content.push({ type: 'horizontalRule' })
        break
      default:
        break
    }
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

export function parseNotes(json: string | null | undefined): JSONContent {
  if (!json) return EMPTY_DOC
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return EMPTY_DOC
  }
  if (parsed && typeof parsed === 'object' && (parsed as JSONContent).type === 'doc') {
    return parsed as JSONContent
  }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as EditorJsData).blocks)) {
    return editorJsToProseMirror(parsed as EditorJsData)
  }
  return EMPTY_DOC
}
