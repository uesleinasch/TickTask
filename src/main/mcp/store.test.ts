import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let mockUserDataDir = ''

vi.mock('electron', () => ({
  app: { getPath: () => mockUserDataDir }
}))

const { readMcpConfig, writeMcpConfig } = await import('./store')

mockUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticktask-mcp-store-'))
const configFile = path.join(mockUserDataDir, 'mcp-config.json')

function clearUserDataDir(): void {
  for (const entry of fs.readdirSync(mockUserDataDir)) {
    fs.rmSync(path.join(mockUserDataDir, entry), { force: true })
  }
}

describe('readMcpConfig', () => {
  beforeEach(clearUserDataDir)
  afterEach(clearUserDataDir)

  it('cria configuração nova quando o arquivo não existe', () => {
    const config = readMcpConfig()

    expect(fs.existsSync(configFile)).toBe(true)
    expect(config.enabled).toBe(false)
    expect(config.token).toHaveLength(64)
  })

  it('grava o arquivo com permissão 0600', () => {
    readMcpConfig()

    const mode = fs.statSync(configFile).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('restaura a permissão para 0600 mesmo se o arquivo já existir aberto', () => {
    writeMcpConfig({})
    fs.chmodSync(configFile, 0o644)

    writeMcpConfig({ enabled: true })

    const mode = fs.statSync(configFile).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('isola arquivo corrompido em vez de rotacionar o token em silêncio', () => {
    const originalToken = writeMcpConfig({}).token
    fs.writeFileSync(configFile, '{ isto não é json', 'utf-8')

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const config = readMcpConfig()

    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
    expect(config.token).not.toBe(originalToken)

    const quarantined = fs
      .readdirSync(mockUserDataDir)
      .find((entry) => entry.startsWith('mcp-config.json.corrupt-'))
    expect(quarantined).toBeDefined()
    expect(fs.readFileSync(path.join(mockUserDataDir, quarantined!), 'utf-8')).toBe(
      '{ isto não é json'
    )
  })

  it('sobe mesmo quando não consegue isolar o arquivo corrompido', () => {
    writeMcpConfig({})
    fs.writeFileSync(configFile, '{ ainda não é json', 'utf-8')

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('permissão negada')
    })

    const config = readMcpConfig()

    expect(errorSpy).toHaveBeenCalledTimes(2)
    renameSpy.mockRestore()
    errorSpy.mockRestore()

    expect(config.token).toHaveLength(64)
    const persisted = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
    expect(persisted.token).toBe(config.token)
  })

  it('sobe com a config em memória quando não consegue gravar a configuração nova', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disco cheio')
    })

    const config = readMcpConfig()

    expect(errorSpy).toHaveBeenCalled()
    writeSpy.mockRestore()
    errorSpy.mockRestore()

    expect(config.enabled).toBe(false)
    expect(config.token).toHaveLength(64)
  })
})
