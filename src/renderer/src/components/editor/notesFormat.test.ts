import { describe, it, expect } from 'vitest'
import { parseNotes, editorJsToProseMirror } from './notesFormat'

describe('parseNotes', () => {
  it('retorna doc vazio para null/invalid', () => {
    expect(parseNotes(null)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(parseNotes('{{')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('passa ProseMirror direto', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(parseNotes(JSON.stringify(doc))).toEqual(doc)
  })

  it('converte Editor.js legado', () => {
    const legacy = { blocks: [{ type: 'paragraph', data: { text: 'oi' } }] }
    const out = parseNotes(JSON.stringify(legacy))
    expect(out.type).toBe('doc')
    expect(out.content?.[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'oi' }]
    })
  })
})

describe('editorJsToProseMirror', () => {
  it('header vira heading com level clampeado', () => {
    const out = editorJsToProseMirror({
      blocks: [{ type: 'header', data: { text: 'T', level: 5 } }]
    })
    expect(out.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'T' }]
    })
  })

  it('list unordered vira bulletList', () => {
    const out = editorJsToProseMirror({
      blocks: [
        { type: 'list', data: { style: 'unordered', items: [{ content: 'a' }, { content: 'b' }] } }
      ]
    })
    expect(out.content?.[0].type).toBe('bulletList')
    expect(out.content?.[0].content?.length).toBe(2)
  })

  it('list checklist vira taskList com checked', () => {
    const out = editorJsToProseMirror({
      blocks: [
        {
          type: 'list',
          data: { style: 'checklist', items: [{ content: 'x', meta: { checked: true } }] }
        }
      ]
    })
    const node = out.content?.[0]
    expect(node?.type).toBe('taskList')
    expect(node?.content?.[0]).toMatchObject({ type: 'taskItem', attrs: { checked: true } })
  })

  it('marca inline <b>/<mark>/<a> vira marks', () => {
    const out = editorJsToProseMirror({
      blocks: [{ type: 'paragraph', data: { text: '<b>x</b><mark>y</mark><a href="u">z</a>' } }]
    })
    const inline = out.content?.[0].content
    expect(inline?.[0]).toEqual({ type: 'text', text: 'x', marks: [{ type: 'bold' }] })
    expect(inline?.[1]).toEqual({ type: 'text', text: 'y', marks: [{ type: 'highlight' }] })
    expect(inline?.[2]).toEqual({
      type: 'text',
      text: 'z',
      marks: [{ type: 'link', attrs: { href: 'u' } }]
    })
  })

  it('code vira codeBlock; delimiter vira horizontalRule', () => {
    const out = editorJsToProseMirror({
      blocks: [
        { type: 'code', data: { code: 'a\nb' } },
        { type: 'delimiter', data: {} }
      ]
    })
    expect(out.content?.[0]).toEqual({
      type: 'codeBlock',
      content: [{ type: 'text', text: 'a\nb' }]
    })
    expect(out.content?.[1]).toEqual({ type: 'horizontalRule' })
  })
})
