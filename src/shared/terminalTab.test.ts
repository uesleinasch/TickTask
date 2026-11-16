import { describe, expect, it } from 'vitest'
import { normalizeTabColor, normalizeTabIcon } from './terminalTab'

describe('normalizeTabIcon', () => {
  it('aceita só ícones do catálogo', () => {
    expect(normalizeTabIcon('rocket')).toBe('rocket')
    expect(normalizeTabIcon('skull')).toBeNull()
    expect(normalizeTabIcon(null)).toBeNull()
  })
})

describe('normalizeTabColor', () => {
  it('aceita hex de 6 dígitos e normaliza a caixa', () => {
    expect(normalizeTabColor('#F97316')).toBe('#f97316')
    expect(normalizeTabColor('red')).toBeNull()
    expect(normalizeTabColor('#fff')).toBeNull()
    expect(normalizeTabColor(null)).toBeNull()
  })
})
