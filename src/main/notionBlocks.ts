// Conversor puro: dados do Editor.js -> blocos nativos do Notion.
// Não faz I/O; pode ser testado isoladamente.

type RichText = {
  type: 'text'
  text: { content: string; link: { url: string } | null }
  annotations: {
    bold: boolean
    italic: boolean
    strikethrough: boolean
    underline: boolean
    code: boolean
    color: string
  }
}

// Bloco do Notion no formato aceito por blocks.children.append.
// Mantido como Record para não acoplar aos tipos internos do SDK.
export type NotionBlock = Record<string, unknown>

interface EditorJsBlock {
  type: string
  data: Record<string, unknown>
}

interface EditorJsData {
  blocks?: EditorJsBlock[]
}

const NOTION_TEXT_LIMIT = 2000

function defaultAnnotations(): RichText['annotations'] {
  return {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default'
  }
}

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

/**
 * Converte o HTML inline produzido pelo Editor.js em segmentos rich_text do Notion.
 * Suporta: <b>/<strong>, <i>/<em>, <u>, <mark> (marca-texto), <code> (código inline),
 * <a href>. Tags desconhecidas são ignoradas (o texto interno é preservado).
 */
export function htmlToRichText(html: string): RichText[] {
  if (!html) return []

  const segments: RichText[] = []
  // Estado de formatação acumulado por contadores (tags podem aninhar).
  const state = { bold: 0, italic: 0, underline: 0, strike: 0, code: 0, mark: 0 }
  let linkUrl: string | null = null

  const pushText = (raw: string): void => {
    if (!raw) return
    const content = decodeEntities(raw)
    if (!content) return
    const annotations = defaultAnnotations()
    annotations.bold = state.bold > 0
    annotations.italic = state.italic > 0
    annotations.underline = state.underline > 0
    annotations.strikethrough = state.strike > 0
    annotations.code = state.code > 0
    if (state.mark > 0) annotations.color = 'yellow_background'
    // Notion limita rich_text a 2000 chars por segmento.
    for (let i = 0; i < content.length; i += NOTION_TEXT_LIMIT) {
      segments.push({
        type: 'text',
        text: {
          content: content.slice(i, i + NOTION_TEXT_LIMIT),
          link: linkUrl ? { url: linkUrl } : null
        },
        annotations: { ...annotations }
      })
    }
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
      case 'a': {
        if (isClosing) {
          linkUrl = null
        } else {
          const hrefMatch = match[2].match(/href\s*=\s*["']([^"']*)["']/i)
          linkUrl = hrefMatch ? hrefMatch[1] : null
        }
        break
      }
      case 'br':
        pushText('\n')
        break
      default:
        // tag ignorada; texto interno já é tratado pelos pushText
        break
    }
  }
  pushText(html.slice(lastIndex))

  return segments
}

function textBlock(type: string, html: string, extra: Record<string, unknown> = {}): NotionBlock {
  return {
    object: 'block',
    type,
    [type]: { rich_text: htmlToRichText(html), ...extra }
  }
}

/** Converte os dados salvos do Editor.js (JSON string) em blocos do Notion. */
export function editorJsToNotionBlocks(notesJson: string | null | undefined): NotionBlock[] {
  if (!notesJson) return []

  let parsed: EditorJsData
  try {
    parsed = JSON.parse(notesJson) as EditorJsData
  } catch {
    return []
  }

  const blocks: NotionBlock[] = []
  for (const block of parsed.blocks ?? []) {
    const data = block.data ?? {}
    switch (block.type) {
      case 'paragraph':
        blocks.push(textBlock('paragraph', String(data.text ?? '')))
        break
      case 'header': {
        const level = Number(data.level ?? 2)
        const headingType = level <= 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3'
        blocks.push(textBlock(headingType, String(data.text ?? '')))
        break
      }
      case 'list': {
        // @editorjs/list v2: style ordered|unordered|checklist; itens são objetos
        // { content, meta: { checked } } (ou strings no formato antigo).
        const style = data.style
        const itemType =
          style === 'ordered'
            ? 'numbered_list_item'
            : style === 'checklist'
              ? 'to_do'
              : 'bulleted_list_item'
        const items = (data.items ?? []) as Array<
          | string
          | { content?: string; text?: string; meta?: { checked?: boolean }; checked?: boolean }
        >
        for (const item of items) {
          const text = typeof item === 'string' ? item : String(item?.content ?? item?.text ?? '')
          if (itemType === 'to_do') {
            const checked =
              typeof item === 'object' ? Boolean(item?.meta?.checked ?? item?.checked) : false
            blocks.push(textBlock('to_do', text, { checked }))
          } else {
            blocks.push(textBlock(itemType, text))
          }
        }
        break
      }
      case 'checklist': {
        // Formato do tool standalone antigo (compatibilidade).
        const items = (data.items ?? []) as Array<{ text?: string; checked?: boolean }>
        for (const item of items) {
          blocks.push(
            textBlock('to_do', String(item?.text ?? ''), { checked: Boolean(item?.checked) })
          )
        }
        break
      }
      case 'quote':
        blocks.push(textBlock('quote', String(data.text ?? '')))
        break
      case 'code':
        // O bloco de código do Editor.js guarda texto puro (sem inline HTML).
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: { content: String(data.code ?? '').slice(0, NOTION_TEXT_LIMIT), link: null },
                annotations: defaultAnnotations()
              }
            ],
            language: 'plain text'
          }
        })
        break
      case 'delimiter':
        blocks.push({ object: 'block', type: 'divider', divider: {} })
        break
      default:
        // tipo desconhecido: ignorado (degradação graciosa)
        break
    }
  }
  return blocks
}

// ===================== ProseMirror (Tiptap) -> blocos do Notion =====================

export type ImageResolver = (assetId: string) => string | null

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

function pushSegments(
  out: RichText[],
  content: string,
  annotations: RichText['annotations'],
  link: string | null
): void {
  if (!content) return
  for (let i = 0; i < content.length; i += NOTION_TEXT_LIMIT) {
    out.push({
      type: 'text',
      text: { content: content.slice(i, i + NOTION_TEXT_LIMIT), link: link ? { url: link } : null },
      annotations: { ...annotations }
    })
  }
}

export function inlineNodesToRichText(nodes: PMNode[] | undefined): RichText[] {
  const out: RichText[] = []
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      pushSegments(out, '\n', defaultAnnotations(), null)
      continue
    }
    if (node.type === 'mention') {
      pushSegments(out, '@' + String(node.attrs?.label ?? ''), defaultAnnotations(), null)
      continue
    }
    if (node.type !== 'text') continue
    const annotations = defaultAnnotations()
    let link: string | null = null
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case 'bold':
          annotations.bold = true
          break
        case 'italic':
          annotations.italic = true
          break
        case 'underline':
          annotations.underline = true
          break
        case 'strike':
          annotations.strikethrough = true
          break
        case 'code':
          annotations.code = true
          break
        case 'highlight':
          annotations.color = 'yellow_background'
          break
        case 'link':
          link = String(mark.attrs?.href ?? '') || null
          break
        default:
          break
      }
    }
    pushSegments(out, String(node.text ?? ''), annotations, link)
  }
  return out
}

function rtBlock(
  type: string,
  inline: PMNode[] | undefined,
  extra: Record<string, unknown> = {}
): NotionBlock {
  return { object: 'block', type, [type]: { rich_text: inlineNodesToRichText(inline), ...extra } }
}

/** Conteúdo inline do primeiro parágrafo filho (usado por list items e blockquote). */
function firstParagraphInline(node: PMNode): PMNode[] {
  const para = (node.content ?? []).find((c) => c.type === 'paragraph')
  return para?.content ?? []
}

function codeBlockFor(node: PMNode): NotionBlock {
  const text = (node.content ?? []).map((c) => String(c.text ?? '')).join('')
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [
        {
          type: 'text',
          text: { content: text.slice(0, NOTION_TEXT_LIMIT), link: null },
          annotations: defaultAnnotations()
        }
      ],
      language: 'plain text'
    }
  }
}

function tableBlockFor(node: PMNode): NotionBlock {
  const rows = (node.content ?? []).filter((r) => r.type === 'tableRow')
  const width = rows.length ? (rows[0].content ?? []).length : 0
  const hasColumnHeader =
    rows.length > 0 && (rows[0].content ?? []).every((c) => c.type === 'tableHeader')
  const children = rows.map((row) => ({
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: (row.content ?? []).map((cell) => inlineNodesToRichText(firstParagraphInline(cell)))
    }
  }))
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: width,
      has_column_header: hasColumnHeader,
      has_row_header: false,
      children
    }
  }
}

export function prosemirrorToNotionBlocks(
  json: string | null | undefined,
  resolveImage?: ImageResolver
): NotionBlock[] {
  if (!json) return []
  let doc: PMNode
  try {
    doc = JSON.parse(json) as PMNode
  } catch {
    return []
  }
  if (!doc || doc.type !== 'doc') return []

  const blocks: NotionBlock[] = []
  for (const node of doc.content ?? []) {
    switch (node.type) {
      case 'paragraph':
        blocks.push(rtBlock('paragraph', node.content))
        break
      case 'heading': {
        const level = Number(node.attrs?.level ?? 2)
        const type = level <= 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3'
        blocks.push(rtBlock(type, node.content))
        break
      }
      case 'bulletList':
        for (const li of node.content ?? [])
          blocks.push(rtBlock('bulleted_list_item', firstParagraphInline(li)))
        break
      case 'orderedList':
        for (const li of node.content ?? [])
          blocks.push(rtBlock('numbered_list_item', firstParagraphInline(li)))
        break
      case 'taskList':
        for (const ti of node.content ?? [])
          blocks.push(
            rtBlock('to_do', firstParagraphInline(ti), { checked: Boolean(ti.attrs?.checked) })
          )
        break
      case 'blockquote':
        blocks.push(rtBlock('quote', firstParagraphInline(node)))
        break
      case 'codeBlock':
        blocks.push(codeBlockFor(node))
        break
      case 'horizontalRule':
        blocks.push({ object: 'block', type: 'divider', divider: {} })
        break
      case 'table':
        blocks.push(tableBlockFor(node))
        break
      case 'image': {
        const id = resolveImage?.(String(node.attrs?.assetId ?? ''))
        if (id)
          blocks.push({
            object: 'block',
            type: 'image',
            image: { type: 'file_upload', file_upload: { id } }
          })
        break
      }
      default:
        break
    }
  }
  return blocks
}

export function collectImageAssetIds(json: string | null | undefined): string[] {
  if (!json) return []
  let doc: PMNode
  try {
    doc = JSON.parse(json) as PMNode
  } catch {
    return []
  }
  if (!doc || doc.type !== 'doc') return []
  const ids: string[] = []
  for (const node of doc.content ?? []) {
    if (node.type === 'image') {
      const id = String(node.attrs?.assetId ?? '')
      if (id) ids.push(id)
    }
  }
  return ids
}

/** Detecta o dialeto salvo e converte para blocos do Notion. */
export function notesToNotionBlocks(
  json: string | null | undefined,
  resolveImage?: ImageResolver
): NotionBlock[] {
  if (!json) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }
  if (parsed && typeof parsed === 'object' && (parsed as PMNode).type === 'doc') {
    return prosemirrorToNotionBlocks(json, resolveImage)
  }
  return editorJsToNotionBlocks(json)
}
