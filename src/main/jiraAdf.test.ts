import { describe, expect, it } from 'vitest'
import {
  adfToPlainText,
  adfToProsemirror,
  collectAdfMedia,
  isEmptyDoc,
  mediaMarkerText,
  plainTextToAdf,
  prosemirrorToAdf,
  type DocNode
} from './jiraAdf'

const text = (value: string, marks?: DocNode['marks']): DocNode =>
  marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }
const p = (...content: DocNode[]): DocNode => ({ type: 'paragraph', content })

describe('adfToProsemirror', () => {
  it('converte blocos e marcas para o schema do Tiptap', () => {
    const adf: DocNode = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Título')] },
        p(
          text('negrito', [{ type: 'strong' }]),
          text(' e '),
          text('link', [{ type: 'link', attrs: { href: 'https://x.dev' } }]),
          text(' cor', [{ type: 'textColor', attrs: { color: '#f00' } }])
        ),
        {
          type: 'orderedList',
          attrs: { order: 3 },
          content: [{ type: 'listItem', content: [p(text('um'))] }]
        },
        { type: 'rule' }
      ]
    }
    expect(adfToProsemirror(adf)).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Título')] },
        p(
          text('negrito', [{ type: 'bold' }]),
          text(' e '),
          text('link', [{ type: 'link', attrs: { href: 'https://x.dev' } }]),
          text(' cor')
        ),
        {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [{ type: 'listItem', content: [p(text('um'))] }]
        },
        { type: 'horizontalRule' }
      ]
    })
  })

  it('converte checklist do Jira em taskList com parágrafo por item', () => {
    const adf: DocNode = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          attrs: { localId: 'a' },
          content: [
            { type: 'taskItem', attrs: { localId: 'b', state: 'DONE' }, content: [text('feito')] }
          ]
        }
      ]
    }
    expect(adfToProsemirror(adf).content).toEqual([
      {
        type: 'taskList',
        content: [{ type: 'taskItem', attrs: { checked: true }, content: [p(text('feito'))] }]
      }
    ])
  })

  it('troca menção por texto e imagem por marcador', () => {
    const adf: DocNode = {
      type: 'doc',
      content: [
        p({ type: 'mention', attrs: { id: 'u1', text: '@Ana' } }),
        {
          type: 'mediaSingle',
          content: [{ type: 'media', attrs: { id: 'img-1', type: 'file' } }]
        }
      ]
    }
    expect(adfToProsemirror(adf).content).toEqual([
      p(text('@Ana')),
      p(text(mediaMarkerText('img-1')))
    ])
  })

  it('documento vazio vira um parágrafo vazio', () => {
    expect(adfToProsemirror(null)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('prosemirrorToAdf', () => {
  it('converte marcas e descarta as que o Jira não tem', () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        p(
          text('a', [{ type: 'bold' }, { type: 'highlight' }]),
          text('b', [{ type: 'code' }, { type: 'italic' }])
        )
      ]
    }
    expect(prosemirrorToAdf(doc)).toEqual({
      type: 'doc',
      version: 1,
      content: [p(text('a', [{ type: 'strong' }]), text('b', [{ type: 'code' }]))]
    })
  })

  it('taskItem do Jira recebe conteúdo inline e localId', () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [{ type: 'taskItem', attrs: { checked: false }, content: [p(text('x'))] }]
        }
      ]
    }
    expect(prosemirrorToAdf(doc).content).toEqual([
      {
        type: 'taskList',
        attrs: { localId: 'tt-1' },
        content: [
          { type: 'taskItem', attrs: { localId: 'tt-2', state: 'TODO' }, content: [text('x')] }
        ]
      }
    ])
  })

  it('item de lista sempre começa com parágrafo e rebaixa título', () => {
    const doc: DocNode = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'heading', attrs: { level: 1 }, content: [text('h')] }]
            }
          ]
        }
      ]
    }
    expect(prosemirrorToAdf(doc).content).toEqual([
      { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('h'))] }] }
    ])
  })

  it('devolve a imagem original do Jira no lugar do marcador e descarta imagem local', () => {
    const media: DocNode = {
      type: 'mediaSingle',
      content: [{ type: 'media', attrs: { id: 'img-1', type: 'file' } }]
    }
    const original: DocNode = { type: 'doc', content: [media] }
    const doc: DocNode = {
      type: 'doc',
      content: [
        p(text(mediaMarkerText('img-1'))),
        p(text(mediaMarkerText('sumiu'))),
        { type: 'image', attrs: { assetId: 'a1' } }
      ]
    }
    expect(prosemirrorToAdf(doc, collectAdfMedia(original)).content).toEqual([media])
  })

  it('ida e volta preserva o documento suportado', () => {
    const adf: DocNode = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [text('T')] },
        p(text('a', [{ type: 'em' }]), { type: 'hardBreak' }, text('b')),
        { type: 'blockquote', content: [p(text('q'))] },
        { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('x()')] },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [p(text('h'))] }
              ]
            }
          ]
        }
      ]
    }
    expect(prosemirrorToAdf(adfToProsemirror(adf))).toEqual({ ...adf, content: adf.content })
  })
})

describe('texto puro', () => {
  it('converte ADF em texto e texto em ADF', () => {
    const adf = plainTextToAdf('linha 1\nlinha 2')
    expect(adf.content).toEqual([p(text('linha 1')), p(text('linha 2'))])
    expect(adfToPlainText(adf)).toBe('linha 1\nlinha 2')
  })
})

describe('isEmptyDoc', () => {
  it('documento só com parágrafos vazios é vazio', () => {
    expect(isEmptyDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true)
    expect(isEmptyDoc({ type: 'doc', content: [p(text('a'))] })).toBe(false)
    expect(isEmptyDoc(null)).toBe(true)
  })
})
