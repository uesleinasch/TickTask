import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { timingSafeEqual } from 'crypto'
import http from 'http'
import type { McpConfig } from './config'
import { createMcpServer } from './server'

const HOST = '127.0.0.1'
const ROUTE = '/mcp'

let httpServer: http.Server | null = null
let startPromise: Promise<void> | null = null

export function isAuthorized(header: string | undefined, token: string): boolean {
  if (!header || token.length === 0) return false
  if (!header.startsWith('Bearer ')) return false

  const provided = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(token)
  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}

export function isMcpRunning(): boolean {
  return httpServer !== null
}

export function startMcpServer(config: McpConfig): Promise<void> {
  if (httpServer) return Promise.resolve()

  // Chamadas concorrentes (ex.: duplo clique no toggle) recebem a mesma promise em
  // curso em vez de disputar o bind da porta com um segundo McpServer/transport.
  if (!startPromise) {
    startPromise = performStart(config).finally(() => {
      startPromise = null
    })
  }

  return startPromise
}

// O SDK só sustenta uma requisição por transport em modo stateless (sessionIdGenerator:
// undefined); reusar o par para a próxima chamada faz o transport rejeitar com erro. Por isso o
// par server+transport nasce e morre dentro de cada requisição.
async function handleMcpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: McpConfig
): Promise<void> {
  const server = createMcpServer(config.bulkThreshold)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  res.on('close', () => {
    transport.close().catch(() => undefined)
    server.close().catch(() => undefined)
  })

  await server.connect(transport)
  await transport.handleRequest(req, res)
}

async function performStart(config: McpConfig): Promise<void> {
  const instance = http.createServer((req, res) => {
    const url = (req.url ?? '').split('?')[0]
    if (url !== ROUTE) {
      res.writeHead(404).end()
      return
    }
    if (!isAuthorized(req.headers.authorization, config.token)) {
      res.writeHead(401).end()
      return
    }
    handleMcpRequest(req, res, config).catch((error) => {
      console.error('[mcp] falha ao tratar requisição:', error)
      if (!res.headersSent) res.writeHead(500).end()
    })
  })

  await new Promise<void>((resolve, reject) => {
    instance.once('error', reject)
    instance.listen(config.port, HOST, () => {
      instance.removeListener('error', reject)
      resolve()
    })
  })

  httpServer = instance
}

export async function stopMcpServer(): Promise<void> {
  // Um start em andamento ainda não marcou `httpServer`; sem esperar por ele aqui,
  // o stop vira no-op e o bind conclui por trás com a config já persistida como off.
  if (startPromise) {
    await startPromise.catch(() => undefined)
  }

  const instance = httpServer
  if (!instance) return
  httpServer = null
  await new Promise<void>((resolve) => instance.close(() => resolve()))
}
