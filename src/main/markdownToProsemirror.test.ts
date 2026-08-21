import { describe, expect, it } from 'vitest'
import { markdownToProsemirror } from './markdownToProsemirror'
import { prosemirrorToMarkdown } from './notesMarkdown'

describe('markdownToProsemirror', () => {
  it('converte parágrafo simples e separa parágrafos por linha em branco', () => {
    expect(markdownToProsemirror('Olá mundo')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olá mundo' }] }]
    })

    const doc = markdownToProsemirror('Um\n\nDois')
    expect(doc.content).toHaveLength(2)
    expect(doc.content[1].content?.[0].text).toBe('Dois')
  })

  it('converte headings de 1 a 3', () => {
    const doc = markdownToProsemirror('# A\n\n## B\n\n### C')
    expect(doc.content.map((node) => node.attrs?.level)).toEqual([1, 2, 3])
    expect(doc.content.every((node) => node.type === 'heading')).toBe(true)
  })

  it('converte lista não ordenada', () => {
    const doc = markdownToProsemirror('- um\n- dois')
    expect(doc.content[0].type).toBe('bulletList')
    expect(doc.content[0].content).toHaveLength(2)
    expect(doc.content[0].content?.[0].type).toBe('listItem')
  })

  it('converte negrito, itálico e código inline numa só passada', () => {
    const doc = markdownToProsemirror('texto **forte**, *leve* e `codigo`')
    const marks = doc.content[0].content?.flatMap((node) => node.marks?.map((m) => m.type) ?? [])
    expect(marks).toContain('bold')
    expect(marks).toContain('italic')
    expect(marks).toContain('code')
  })

  it('converte bloco de código preservando a linguagem', () => {
    const doc = markdownToProsemirror('```ts\nconst a = 1\n```')
    expect(doc.content[0].type).toBe('codeBlock')
    expect(doc.content[0].attrs?.language).toBe('ts')
    expect(doc.content[0].content?.[0].text).toBe('const a = 1')
  })

  it('sobrevive ao round-trip do subconjunto suportado', () => {
    const original = '# Título\n\nTexto com **forte**.\n\n- um\n- dois'
    const roundTrip = prosemirrorToMarkdown(JSON.stringify(markdownToProsemirror(original)))
    expect(roundTrip).toContain('# Título')
    expect(roundTrip).toContain('**forte**')
    expect(roundTrip).toContain('- um')
  })
})
