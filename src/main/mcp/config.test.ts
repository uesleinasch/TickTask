import { describe, expect, it } from 'vitest'
import { DEFAULT_BULK_THRESHOLD, DEFAULT_PORT, generateToken, normalizeConfig } from './config'

describe('normalizeConfig', () => {
  it('devolve os defaults quando o arquivo não existe', () => {
    const config = normalizeConfig(undefined, () => 'tok')
    expect(config).toEqual({
      enabled: false,
      port: DEFAULT_PORT,
      token: 'tok',
      bulkThreshold: DEFAULT_BULK_THRESHOLD
    })
  })

  it('preserva valores válidos já gravados', () => {
    const config = normalizeConfig(
      { enabled: true, port: 40000, token: 'abc', bulkThreshold: 10 },
      () => 'tok'
    )
    expect(config).toEqual({ enabled: true, port: 40000, token: 'abc', bulkThreshold: 10 })
  })

  it('gera token quando o gravado está vazio', () => {
    expect(normalizeConfig({ token: '' }, () => 'novo').token).toBe('novo')
  })

  it('descarta porta fora da faixa utilizável', () => {
    expect(normalizeConfig({ port: 80 }, () => 'tok').port).toBe(DEFAULT_PORT)
    expect(normalizeConfig({ port: 70000 }, () => 'tok').port).toBe(DEFAULT_PORT)
  })

  it('exige bulkThreshold inteiro maior que zero', () => {
    expect(normalizeConfig({ bulkThreshold: 0 }, () => 'tok').bulkThreshold).toBe(
      DEFAULT_BULK_THRESHOLD
    )
    expect(normalizeConfig({ bulkThreshold: 2.5 }, () => 'tok').bulkThreshold).toBe(
      DEFAULT_BULK_THRESHOLD
    )
  })
})

describe('generateToken', () => {
  it('produz hex de 64 caracteres', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('não repete entre chamadas', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})
