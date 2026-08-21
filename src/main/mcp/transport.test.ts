import { describe, expect, it } from 'vitest'
import { isAuthorized } from './transport'

const TOKEN = 'a'.repeat(64)

describe('isAuthorized', () => {
  it('aceita o token correto com o prefixo Bearer', () => {
    expect(isAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(true)
  })

  it('recusa header ausente', () => {
    expect(isAuthorized(undefined, TOKEN)).toBe(false)
  })

  it('recusa token errado do mesmo tamanho', () => {
    expect(isAuthorized(`Bearer ${'b'.repeat(64)}`, TOKEN)).toBe(false)
  })

  it('recusa token de tamanho diferente sem estourar', () => {
    expect(isAuthorized('Bearer curto', TOKEN)).toBe(false)
  })

  it('recusa esquema diferente de Bearer', () => {
    expect(isAuthorized(`Basic ${TOKEN}`, TOKEN)).toBe(false)
  })

  it('recusa token vazio configurado', () => {
    expect(isAuthorized('Bearer ', '')).toBe(false)
  })
})
