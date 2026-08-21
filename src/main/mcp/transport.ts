import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { timingSafeEqual } from 'crypto'
import http from 'http'
import type { McpConfig } from './config'
import { createMcpServer } from './server'

const HOST = '127.0.0.1'
const ROUTE = '/mcp'

let httpServer: http.Server | null = null

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

export async function startMcpServer(config: McpConfig): Promise<void> {
  if (httpServer) return

  const server = createMcpServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

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
    transport.handleRequest(req, res).catch(() => {
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
  const instance = httpServer
  if (!instance) return
  httpServer = null
  await new Promise<void>((resolve) => instance.close(() => resolve()))
}
