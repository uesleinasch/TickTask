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
        const ordered = data.style === 'ordered'
        const itemType = ordered ? 'numbered_list_item' : 'bulleted_list_item'
        const items = (data.items ?? []) as Array<string | { content?: string }>
        for (const item of items) {
          const text = typeof item === 'string' ? item : String(item?.content ?? '')
          blocks.push(textBlock(itemType, text))
        }
        break
      }
      case 'checklist': {
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
