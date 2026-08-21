import { describe, expect, it } from 'vitest'
import { resolveByName } from './resolve'

const ROWS = [
  { id: 1, name: 'TickTask' },
  { id: 2, name: 'Casa' },
  { id: 3, name: 'casa' }
]

describe('resolveByName', () => {
  it('devolve o id direto quando recebe número', () => {
    expect(resolveByName(ROWS, 7)).toEqual({ ok: true, id: 7 })
  })

  it('resolve nome exato', () => {
    expect(resolveByName(ROWS, 'TickTask')).toEqual({ ok: true, id: 1 })
  })

  it('resolve ignorando caixa quando não há ambiguidade', () => {
    expect(resolveByName([{ id: 1, name: 'TickTask' }], 'ticktask')).toEqual({ ok: true, id: 1 })
  })

  it('ignora espaços nas pontas', () => {
    expect(resolveByName(ROWS, '  TickTask  ')).toEqual({ ok: true, id: 1 })
  })

  it('reporta ambiguidade quando dois nomes casam por caixa diferente', () => {
    expect(resolveByName(ROWS, 'CASA')).toEqual({
      ok: false,
      code: 'ambiguous',
      candidates: ['Casa', 'casa']
    })
  })

  it('prefere a correspondência exata sobre a insensível a caixa', () => {
    expect(resolveByName(ROWS, 'Casa')).toEqual({ ok: true, id: 2 })
  })

  it('reporta não encontrado listando os candidatos existentes', () => {
    expect(resolveByName(ROWS, 'Trabalho')).toEqual({
      ok: false,
      code: 'not_found',
      candidates: ['TickTask', 'Casa', 'casa']
    })
  })
})
