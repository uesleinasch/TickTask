import { describe, expect, it } from 'vitest'
import { notesPlainText, searchSnippet } from './notesPlainText'

const doc = (content: unknown[]): string => JSON.stringify({ type: 'doc', content })
const p = (...content: unknown[]): unknown => ({ type: 'paragraph', content })
const t = (text: string): unknown => ({ type: 'text', text })

describe('notesPlainText', () => {
  it('junta blocos com quebra de linha e inclui menções', () => {
    const raw = doc([
      { type: 'heading', attrs: { level: 1 }, content: [t('Ata')] },
      p(t('Falar com '), { type: 'mention', attrs: { label: 'Deploy API' } }, t(' amanhã')),
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [p(t('item um'))] }]
      }
    ])
    expect(notesPlainText(raw)).toBe('Ata\nFalar com @Deploy API amanhã\nitem um')
  })

  it('ignora nota vazia, inválida ou legada', () => {
    expect(notesPlainText(null)).toBe('')
    expect(notesPlainText('{oops')).toBe('')
    expect(notesPlainText(JSON.stringify({ blocks: [{ type: 'paragraph' }] }))).toBe('')
  })
})

describe('searchSnippet', () => {
  it('recorta em volta da ocorrência, sem diferenciar caixa', () => {
    const text = `${'a'.repeat(100)} Reunião de PLANEJAMENTO ${'b'.repeat(100)}`
    const snippet = searchSnippet(text, 'planejamento', 10)
    expect(snippet).toBe('…eunião de PLANEJAMENTO bbbbbbbbb…')
  })

  it('vazio quando não acha', () => {
    expect(searchSnippet('abc', 'z')).toBe('')
    expect(searchSnippet('abc', ' ')).toBe('')
  })
})
