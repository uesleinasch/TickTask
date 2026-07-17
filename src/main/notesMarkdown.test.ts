import { describe, it, expect } from 'vitest'
import { prosemirrorToMarkdown } from './notesMarkdown'

const doc = (content: unknown[]): string => JSON.stringify({ type: 'doc', content })

describe('prosemirrorToMarkdown', () => {
  it('headings, parágrafo e marks inline', () => {
    const md = prosemirrorToMarkdown(
      doc([
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'T' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'b', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'c', marks: [{ type: 'link', attrs: { href: 'u' } }] }
          ]
        }
      ])
    )
    expect(md).toContain('## T')
    expect(md).toContain('**a**')
    expect(md).toContain('*b*')
    expect(md).toContain('[c](u)')
  })

  it('listas e checklist', () => {
    const md = prosemirrorToMarkdown(
      doc([
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }]
            }
          ]
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'feito' }] }]
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo' }] }]
            }
          ]
        }
      ])
    )
    expect(md).toContain('- x')
    expect(md).toContain('- [x] feito')
    expect(md).toContain('- [ ] todo')
  })

  it('tabela GFM', () => {
    const md = prosemirrorToMarkdown(
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
    expect(md).toContain('| A | B |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| 1 | 2 |')
  })

  it('imagem via resolver, codeBlock, hr e quote', () => {
    const md = prosemirrorToMarkdown(
      doc([
        { type: 'image', attrs: { assetId: 'a1', alt: 'foto' } },
        { type: 'codeBlock', content: [{ type: 'text', text: 'x=1' }] },
        { type: 'horizontalRule' },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }]
        }
      ]),
      (id) => `assets/${id}.png`
    )
    expect(md).toContain('![foto](assets/a1.png)')
    expect(md).toContain('```')
    expect(md).toContain('x=1')
    expect(md).toContain('---')
    expect(md).toContain('> q')
  })

  it('menção vira @label', () => {
    const md = prosemirrorToMarkdown(
      doc([{ type: 'paragraph', content: [{ type: 'mention', attrs: { label: 'Proj' } }] }])
    )
    expect(md).toContain('@Proj')
  })
})
