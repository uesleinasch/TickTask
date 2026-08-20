import { describe, it, expect } from 'vitest'
import { shouldBootstrapTimerStore } from './timerWindow'

describe('shouldBootstrapTimerStore', () => {
  it('roda na janela principal', () => {
    expect(shouldBootstrapTimerStore('')).toBe(true)
    expect(shouldBootstrapTimerStore('#/')).toBe(true)
    expect(shouldBootstrapTimerStore('#/task/12')).toBe(true)
    expect(shouldBootstrapTimerStore('#/calendar')).toBe(true)
  })

  it('não roda na janela flutuante — ela só exibe o que o main envia', () => {
    expect(shouldBootstrapTimerStore('#/float')).toBe(false)
    expect(shouldBootstrapTimerStore('#/float/')).toBe(false)
  })

  it('não roda na captura rápida', () => {
    expect(shouldBootstrapTimerStore('#/quick-capture')).toBe(false)
    expect(shouldBootstrapTimerStore('#/quick-capture/')).toBe(false)
  })

  it('não confunde rota que começa com o mesmo prefixo', () => {
    expect(shouldBootstrapTimerStore('#/floating-ideas')).toBe(true)
  })

  it('ignora query string na hash', () => {
    expect(shouldBootstrapTimerStore('#/float?debug=1')).toBe(false)
  })
})
