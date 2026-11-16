import { describe, expect, it } from 'vitest'
import {
  canPlaceUnder,
  dropPlacement,
  flattenPageTree,
  indentPlacement,
  outdentPlacement,
  pageDepth,
  subtreeHeight,
  subtreeIds,
  type PageNode
} from './notebookTree'

function page(id: number, parent: number | null, position: number): PageNode {
  return { id, parent_page_id: parent, position }
}

// 1
//   2
//     3
//   4
// 5
// 6
const TREE = [
  page(5, null, 1),
  page(1, null, 0),
  page(3, 2, 0),
  page(2, 1, 0),
  page(4, 1, 1),
  page(6, null, 2)
]

describe('flattenPageTree', () => {
  it('ordena em profundidade, irmãos por posição', () => {
    expect(flattenPageTree(TREE).map((f) => [f.page.id, f.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
      [5, 0],
      [6, 0]
    ])
  })

  it('trata pai ausente como raiz', () => {
    expect(flattenPageTree([page(7, 99, 0)]).map((f) => f.depth)).toEqual([0])
  })
})

describe('profundidade e subárvore', () => {
  it('mede nível, altura e descendentes', () => {
    expect(pageDepth(TREE, 3)).toBe(2)
    expect(pageDepth(TREE, 5)).toBe(0)
    expect(subtreeHeight(TREE, 1)).toBe(2)
    expect(subtreeHeight(TREE, 4)).toBe(0)
    expect(subtreeIds(TREE, 1).sort()).toEqual([1, 2, 3, 4])
  })

  it('canPlaceUnder respeita o limite de 2 níveis e recusa ciclo', () => {
    expect(canPlaceUnder(TREE, 5, 4)).toBe(true)
    expect(canPlaceUnder(TREE, 5, 3)).toBe(false)
    expect(canPlaceUnder(TREE, 2, 5)).toBe(true)
    expect(canPlaceUnder(TREE, 1, 5)).toBe(false)
    expect(canPlaceUnder(TREE, 1, 3)).toBe(false)
    expect(canPlaceUnder(TREE, 2, null)).toBe(true)
  })
})

describe('dropPlacement', () => {
  it('descendo, fica depois da linha alvo', () => {
    expect(dropPlacement(TREE, 1, 5)).toEqual({ parent_page_id: null, index: 1 })
  })

  it('subindo, fica antes da linha alvo', () => {
    expect(dropPlacement(TREE, 6, 5)).toEqual({ parent_page_id: null, index: 1 })
  })

  it('soltar sobre uma subpágina vira irmã dela', () => {
    expect(dropPlacement(TREE, 5, 4)).toEqual({ parent_page_id: 1, index: 1 })
  })

  it('recusa soltar dentro da própria subárvore', () => {
    expect(dropPlacement(TREE, 1, 3)).toBeNull()
  })
})

describe('recuar e avançar', () => {
  it('recuar vira último filho da irmã anterior', () => {
    expect(indentPlacement(TREE, 5)).toEqual({ parent_page_id: 1, index: 2 })
    expect(indentPlacement(TREE, 1)).toBeNull()
  })

  it('avançar vira irmã logo depois do pai', () => {
    expect(outdentPlacement(TREE, 3)).toEqual({ parent_page_id: 1, index: 1 })
    expect(outdentPlacement(TREE, 2)).toEqual({ parent_page_id: null, index: 1 })
    expect(outdentPlacement(TREE, 1)).toBeNull()
  })
})
