import { describe, it, expect } from 'vitest'
import { clampNotesWidth, MIN_NOTES_WIDTH, MIN_DETAILS_SPACE } from './notesLayout'

describe('clampNotesWidth', () => {
  it('mantém larguras dentro da faixa utilizável', () => {
    expect(clampNotesWidth(700, 1920)).toBe(700)
  })

  it('não deixa o painel menor que o mínimo legível', () => {
    expect(clampNotesWidth(120, 1920)).toBe(MIN_NOTES_WIDTH)
    expect(clampNotesWidth(-40, 1920)).toBe(MIN_NOTES_WIDTH)
  })

  it('preserva espaço para a coluna de detalhes e o timer', () => {
    expect(clampNotesWidth(1800, 1920)).toBe(1920 - MIN_DETAILS_SPACE)
  })

  it('prioriza o mínimo do painel quando a janela é estreita', () => {
    expect(clampNotesWidth(900, 700)).toBe(MIN_NOTES_WIDTH)
  })

  it('arredonda frações vindas do arraste do mouse', () => {
    expect(clampNotesWidth(612.7, 1920)).toBe(613)
  })

  it('ignora valores não numéricos', () => {
    expect(clampNotesWidth(Number.NaN, 1920)).toBe(MIN_NOTES_WIDTH)
  })
})
