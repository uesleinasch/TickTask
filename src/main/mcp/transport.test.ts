import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { McpConfig } from './config'

let mockUserDataDir = ''

vi.mock('electron', () => ({
  app: { getPath: () => mockUserDataDir }
}))

const { isAuthorized, isMcpRunning, startMcpServer, stopMcpServer } = await import('./transport')

mockUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticktask-mcp-transport-'))

const TOKEN = 'a'.repeat(64)

function buildConfig(port: number): McpConfig {
  return { enabled: true, port, token: TOKEN, bulkThreshold: 5 }
}

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

describe('startMcpServer', () => {
  afterEach(async () => {
    await stopMcpServer()
  })

  it('devolve a mesma promise em curso para chamadas concorrentes', async () => {
    const config = buildConfig(0)
    const first = startMcpServer(config)
    const second = startMcpServer(config)

    expect(second).toBe(first)
    await first
    expect(isMcpRunning()).toBe(true)
  })

  it('libera para nova tentativa depois de uma falha de bind', async () => {
    const blocker = http.createServer()
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve))
    const address = blocker.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0

    await expect(startMcpServer(buildConfig(port))).rejects.toThrow()
    expect(isMcpRunning()).toBe(false)

    await new Promise<void>((resolve) => blocker.close(() => resolve()))
    await startMcpServer(buildConfig(port))
    expect(isMcpRunning()).toBe(true)
  })
})

describe('stopMcpServer', () => {
  afterEach(async () => {
    await stopMcpServer()
  })

  it('interrompe um start em andamento e libera para um novo start em seguida', async () => {
    const pendingStart = startMcpServer(buildConfig(0))

    await stopMcpServer()
    await pendingStart

    expect(isMcpRunning()).toBe(false)

    await startMcpServer(buildConfig(0))
    expect(isMcpRunning()).toBe(true)
  })

  it('não propaga a falha de um start em andamento', async () => {
    const blocker = http.createServer()
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve))
    const address = blocker.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0

    const pendingStart = startMcpServer(buildConfig(port))

    await expect(stopMcpServer()).resolves.toBeUndefined()
    await expect(pendingStart).rejects.toThrow()
    expect(isMcpRunning()).toBe(false)

    await new Promise<void>((resolve) => blocker.close(() => resolve()))
  })
})
