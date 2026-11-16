import { describe, expect, it } from 'vitest'
import { mentionRoute } from './mentionRoute'

describe('mentionRoute', () => {
  it('leva task, projeto e página para a tela de cada um', () => {
    expect(mentionRoute('task', 3)).toBe('/task/3')
    expect(mentionRoute('project', '7')).toBe('/project/7')
    expect(mentionRoute('page', 12)).toBe('/notebooks?page=12')
  })

  it('não navega para contexto nem com id inválido', () => {
    expect(mentionRoute('context', 1)).toBeNull()
    expect(mentionRoute('task', null)).toBeNull()
    expect(mentionRoute('task', 'abc')).toBeNull()
  })
})
