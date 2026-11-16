import { describe, expect, it } from 'vitest'
import { activatePane, openInSplit, panesAfterRemoval, reconcilePanes } from './terminalPanes'

const ids = ['a', 'b', 'c']

describe('reconcilePanes', () => {
  it('mantém os painéis que ainda existem', () => {
    expect(reconcilePanes(ids, { activeId: 'b', splitId: 'c' })).toEqual({
      activeId: 'b',
      splitId: 'c'
    })
  })

  it('promove o painel da direita quando o da esquerda sumiu', () => {
    expect(reconcilePanes(ids, { activeId: 'x', splitId: 'c' })).toEqual({
      activeId: 'c',
      splitId: null
    })
  })

  it('cai na primeira sessão e desfaz o split inválido', () => {
    expect(reconcilePanes(ids, { activeId: 'x', splitId: 'y' })).toEqual({
      activeId: 'a',
      splitId: null
    })
    expect(reconcilePanes([], { activeId: 'a', splitId: null })).toEqual({
      activeId: null,
      splitId: null
    })
  })
})

describe('panesAfterRemoval', () => {
  it('fechar o painel da direita só desfaz o split', () => {
    expect(panesAfterRemoval(ids, { activeId: 'a', splitId: 'b' }, 'b')).toEqual({
      activeId: 'a',
      splitId: null
    })
  })

  it('fechar o da esquerda com split passa a direita para a esquerda', () => {
    expect(panesAfterRemoval(ids, { activeId: 'a', splitId: 'c' }, 'a')).toEqual({
      activeId: 'c',
      splitId: null
    })
  })

  it('sem split, fechar a ativa escolhe a vizinha', () => {
    expect(panesAfterRemoval(ids, { activeId: 'c', splitId: null }, 'c')).toEqual({
      activeId: 'b',
      splitId: null
    })
    expect(panesAfterRemoval(ids, { activeId: 'a', splitId: null }, 'b')).toEqual({
      activeId: 'a',
      splitId: null
    })
  })
})

describe('activatePane / openInSplit', () => {
  it('ativar a sessão da direita não mexe nos painéis', () => {
    const panes = { activeId: 'a', splitId: 'b' }
    expect(activatePane(panes, 'b')).toBe(panes)
    expect(activatePane(panes, 'c')).toEqual({ activeId: 'c', splitId: 'b' })
  })

  it('não abre à direita a mesma sessão da esquerda', () => {
    const panes = { activeId: 'a', splitId: null }
    expect(openInSplit(panes, 'a')).toBe(panes)
    expect(openInSplit(panes, 'c')).toEqual({ activeId: 'a', splitId: 'c' })
  })
})
