import http from 'http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { McpConfig } from './config'
import type { ConfirmStore } from './confirmGuard'
import * as mcpServer from './server'
import { isAuthorized, isMcpRunning, startMcpServer, stopMcpServer } from './transport'

vi.mock('./server', async (importOriginal) => {
  const original = await importOriginal<typeof import('./server')>()
  return { ...original, createMcpServer: vi.fn(original.createMcpServer) }
})

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

describe('integração HTTP', () => {
  const PORT = 48765

  afterEach(async () => {
    await stopMcpServer()
  })

  it('atende duas chamadas initialize e um tools/list em sequência', async () => {
    await startMcpServer(buildConfig(PORT))

    const url = `http://127.0.0.1:${PORT}/mcp`
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${TOKEN}`
    }
    const initializeBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'transport-test', version: '1.0.0' }
      }
    })

    const firstInitialize = await fetch(url, { method: 'POST', headers, body: initializeBody })
    expect(firstInitialize.status).toBe(200)
    await firstInitialize.text()

    const secondInitialize = await fetch(url, { method: 'POST', headers, body: initializeBody })
    expect(secondInitialize.status).toBe(200)
    await secondInitialize.text()

    const toolsListResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    })
    expect(toolsListResponse.status).toBe(200)

    const body = await toolsListResponse.text()
    const dataLine = body.split('\n').find((line) => line.startsWith('data: '))
    const payload = JSON.parse((dataLine ?? '').slice('data: '.length))
    expect(payload.result.tools.length).toBeGreaterThan(0)
  })
})

describe('confirmação entre requisições', () => {
  const PORT = 48766

  afterEach(async () => {
    await stopMcpServer()
  })

  it('o token emitido numa requisição vale na seguinte', async () => {
    const createMcpServer = vi.mocked(mcpServer.createMcpServer)
    createMcpServer.mockClear()
    await startMcpServer(buildConfig(PORT))

    const initialize = () =>
      fetch(`http://127.0.0.1:${PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'transport-test', version: '1.0.0' }
          }
        })
      }).then((response) => response.text())

    await initialize()
    await initialize()

    const [primeira, segunda] = createMcpServer.mock.calls.map((args) => args[1] as ConfirmStore | undefined)
    const operation = { kind: 'delete_tasks', payload: { ids: [1, 2] } }
    const token = primeira!.issue(operation)
    expect(segunda!.consume(token, operation)).toEqual({ ok: true })
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
