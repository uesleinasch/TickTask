import { describe, expect, it } from 'vitest'
import { applyGroupOrder, moveGroupKey } from './groupOrder'

const g = (...keys: string[]): { key: string }[] => keys.map((key) => ({ key }))
const keys = (groups: { key: string }[]): string[] => groups.map((group) => group.key)

describe('applyGroupOrder', () => {
  it('mantém a ordem padrão sem ordem salva', () => {
    expect(keys(applyGroupOrder(g('a', 'b', 'c'), []))).toEqual(['a', 'b', 'c'])
  })

  it('segue a ordem salva e põe os grupos novos depois, na ordem padrão', () => {
    expect(keys(applyGroupOrder(g('a', 'b', 'c', 'd'), ['c', 'a']))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('ignora chaves salvas que não estão na tela', () => {
    expect(keys(applyGroupOrder(g('a', 'b'), ['x', 'b', 'y', 'a']))).toEqual(['b', 'a'])
  })
})

describe('moveGroupKey', () => {
  it('move para baixo e para cima', () => {
    expect(moveGroupKey([], ['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a'])
    expect(moveGroupKey([], ['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
  })

  it('preserva a posição das chaves salvas que estão fora da tela', () => {
    const next = moveGroupKey(['a', 'x', 'b', 'c'], ['a', 'b', 'c'], 'c', 'a')
    expect(next).toEqual(['c', 'a', 'x', 'b'])
    expect(keys(applyGroupOrder(g('a', 'b', 'c'), next))).toEqual(['c', 'a', 'b'])
  })

  it('acrescenta grupos visíveis ainda sem posição', () => {
    expect(moveGroupKey(['b'], ['b', 'a', 'c'], 'c', 'b')).toEqual(['c', 'b', 'a'])
  })
})
