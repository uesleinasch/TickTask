import { describe, it, expect } from 'vitest'
import {
  prosemirrorToNotionBlocks,
  inlineNodesToRichText,
  notesToNotionBlocks,
  collectImageAssetIds
} from './notionBlocks'

const doc = (content: unknown[]): string => JSON.stringify({ type: 'doc', content })

describe('inlineNodesToRichText', () => {
  it('mapeia marks para annotations', () => {
    const rt = inlineNodesToRichText([
      { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'highlight' }] },
      { type: 'text', text: 'b', marks: [{ type: 'link', attrs: { href: 'u' } }] }
    ])
    expect(rt[0].annotations.bold).toBe(true)
    expect(rt[0].annotations.color).toBe('yellow_background')
    expect(rt[1].text.link).toEqual({ url: 'u' })
  })

  it('mention vira texto plain @label', () => {
    const rt = inlineNodesToRichText([{ type: 'mention', attrs: { label: 'Tarefa X' } }])
    expect(rt[0].text.content).toBe('@Tarefa X')
  })
})

describe('prosemirrorToNotionBlocks', () => {
  it('heading/quote/divider/code', () => {
    const blocks = prosemirrorToNotionBlocks(
      doc([
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H' }] },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }]
        },
        { type: 'horizontalRule' },
        { type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }
      ])
    )
    expect(blocks[0].type).toBe('heading_1')
    expect(blocks[1].type).toBe('quote')
    expect(blocks[2].type).toBe('divider')
    expect(blocks[3].type).toBe('code')
  })

  it('taskList vira to_do com checked', () => {
    const blocks = prosemirrorToNotionBlocks(
      doc([
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 't' }] }]
            }
          ]
        }
      ])
    )
    expect(blocks[0].type).toBe('to_do')
    expect((blocks[0].to_do as { checked: boolean }).checked).toBe(true)
  })

  it('table vira table block do Notion com header', () => {
    const blocks = prosemirrorToNotionBlocks(
      doc([
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }]
                },
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }]
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }]
                }
              ]
            }
          ]
        }
      ])
    )
    expect(blocks[0].type).toBe('table')
    const t = blocks[0].table as {
      table_width: number
      has_column_header: boolean
      children: Array<{ table_row: { cells: Array<Array<{ text: { content: string } }>> } }>
    }
    expect(t.table_width).toBe(2)
    expect(t.has_column_header).toBe(true)
    expect(t.children.length).toBe(2)
    expect(t.children[0].table_row.cells[0][0].text.content).toBe('A')
    expect(t.children[1].table_row.cells[1][0].text.content).toBe('2')
  })

  it('imagem usa resolver; sem resolver é omitida', () => {
    const d = doc([{ type: 'image', attrs: { assetId: 'a1' } }])
    expect(prosemirrorToNotionBlocks(d)).toEqual([])
    const blocks = prosemirrorToNotionBlocks(d, (id) => (id === 'a1' ? 'fu_1' : null))
    expect(blocks[0]).toEqual({
      object: 'block',
      type: 'image',
      image: { type: 'file_upload', file_upload: { id: 'fu_1' } }
    })
  })
})

describe('notesToNotionBlocks dispatcher', () => {
  it('detecta ProseMirror', () => {
    const blocks = notesToNotionBlocks(
      doc([{ type: 'paragraph', content: [{ type: 'text', text: 'p' }] }])
    )
    expect(blocks[0].type).toBe('paragraph')
  })
  it('cai no legado para Editor.js', () => {
    const legacy = JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'p' } }] })
    expect(notesToNotionBlocks(legacy)[0].type).toBe('paragraph')
  })
})

describe('collectImageAssetIds', () => {
  it('coleta assetIds de imagens', () => {
    expect(
      collectImageAssetIds(
        doc([
          { type: 'image', attrs: { assetId: 'a1' } },
          { type: 'image', attrs: { assetId: 'a2' } }
        ])
      )
    ).toEqual(['a1', 'a2'])
  })
})
