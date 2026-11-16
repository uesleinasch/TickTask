import { describe, expect, it } from 'vitest'
import {
  bodyBlockIdsToDelete,
  planPageTarget,
  sameNotionId,
  titleProperty
} from './notionNotebookPlan'

const PARENT = '1a2b3c4d-0000-1111-2222-333344445555'

describe('planPageTarget', () => {
  it('cria quando não existe ou foi arquivada', () => {
    expect(planPageTarget(null, PARENT)).toBe('create')
    expect(planPageTarget({ archived: true, parentId: PARENT }, PARENT)).toBe('create')
  })

  it('atualiza quando o pai confere, ignorando hífens e caixa', () => {
    expect(
      planPageTarget({ archived: false, parentId: PARENT.replace(/-/g, '').toUpperCase() }, PARENT)
    ).toBe('update')
  })

  it('recria quando o pai mudou', () => {
    expect(planPageTarget({ archived: false, parentId: 'outro' }, PARENT)).toBe('recreate')
    expect(planPageTarget({ archived: false, parentId: null }, PARENT)).toBe('recreate')
  })
})

describe('sameNotionId', () => {
  it('não casa vazio', () => {
    expect(sameNotionId(null, PARENT)).toBe(false)
    expect(sameNotionId('', '')).toBe(false)
  })
})

describe('bodyBlockIdsToDelete', () => {
  it('preserva subpáginas e databases filhas', () => {
    expect(
      bodyBlockIdsToDelete([
        { id: 'a', type: 'paragraph' },
        { id: 'b', type: 'child_page' },
        { id: 'c', type: 'image' },
        { id: 'd', type: 'child_database' }
      ])
    ).toEqual(['a', 'c'])
  })
})

describe('titleProperty', () => {
  it('usa o fallback para título vazio e corta no limite do Notion', () => {
    expect(titleProperty('  ', 'Sem título')).toEqual({
      title: [{ text: { content: 'Sem título' } }]
    })
    expect(titleProperty('x'.repeat(2100), '').title[0].text.content).toHaveLength(2000)
  })
})
