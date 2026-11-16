import { describe, expect, it } from 'vitest'
import { liveSeconds } from './liveSeconds'

describe('liveSeconds', () => {
  it('usa o tempo do timer ativo quando a task está rodando', () => {
    expect(liveSeconds({ id: 7, total_seconds: 100 }, { 7: { displaySeconds: 165 } })).toBe(165)
  })

  it('cai no total salvo quando a task não tem timer ativo', () => {
    expect(liveSeconds({ id: 7, total_seconds: 100 }, { 8: { displaySeconds: 165 } })).toBe(100)
  })
})
