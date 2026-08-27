import { spawn } from 'child_process'
import fs from 'fs'
import http from 'http'
import { connect } from 'net'
import { join } from 'path'
import { userDataDir } from '../shared/userDataDir'
import { extractPayload, frameId, jsonRpcError, splitFrames } from './protocol'

interface BridgeConfig {
  enabled: boolean
  port: number
  token: string
}

interface HttpReply {
  status: number
  contentType: string
  body: string
}

const CONFIG_FILE = 'mcp-config.json'
const HOST = '127.0.0.1'
const ROUTE = '/mcp'
const LAUNCH_TIMEOUT_MS = 20_000
const POLL_INTERVAL_MS = 250

let launching: Promise<void> | null = null

// Lida a cada frame de propósito: regenerar o token em Settings passa a valer na chamada
// seguinte, sem reiniciar o cliente MCP.
function readConfig(): BridgeConfig | null {
  try {
    const raw = fs.readFileSync(join(userDataDir(), CONFIG_FILE), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<BridgeConfig>
    if (typeof parsed.port !== 'number' || typeof parsed.token !== 'string') return null
    return { enabled: parsed.enabled === true, port: parsed.port, token: parsed.token }
  } catch {
    return null
  }
}

function post(config: BridgeConfig, payload: string): Promise<HttpReply> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: HOST,
        port: config.port,
        path: ROUTE,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${config.token}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            contentType: response.headers['content-type'] ?? '',
            body: Buffer.concat(chunks).toString('utf-8')
          })
        )
      }
    )

    request.on('error', reject)
    request.end(payload)
  })
}

function isConnectionRefused(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code
  return code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'EPIPE'
}

function launchApp(): void {
  const env = { ...process.env }
  // A ponte roda sob ELECTRON_RUN_AS_NODE=1; herdada pelo filho, ela faria o Electron subir
  // como Node puro — sem janela, sem servidor MCP.
  delete env.ELECTRON_RUN_AS_NODE

  const child = spawn(process.execPath, ['--hidden'], {
    detached: true,
    stdio: 'ignore',
    env
  })
  child.unref()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Probe TCP em vez de uma requisição MCP: só interessa saber se a porta já aceita conexão, e
// um POST inválido apenas para sondar sujaria o log do app com erro de parse.
function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: HOST, port })
    const finish = (open: boolean): void => {
      socket.destroy()
      resolve(open)
    }
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(POLL_INTERVAL_MS, () => finish(false))
  })
}

async function waitForServer(config: BridgeConfig): Promise<void> {
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS

  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS)
    if (await isPortOpen(config.port)) return
  }

  throw new Error('tempo esgotado ao aguardar o TickTask abrir')
}

async function ensureApp(config: BridgeConfig): Promise<void> {
  if (!launching) {
    launching = (async () => {
      launchApp()
      await waitForServer(config)
    })().finally(() => {
      launching = null
    })
  }

  await launching
}

async function send(config: BridgeConfig, frame: string): Promise<HttpReply> {
  try {
    return await post(config, frame)
  } catch (error) {
    if (!isConnectionRefused(error)) throw error
    await ensureApp(config)
    return await post(config, frame)
  }
}

function write(payload: string): void {
  process.stdout.write(`${payload}\n`)
}

async function handleFrame(frame: string): Promise<void> {
  const id = frameId(frame)
  const config = readConfig()

  if (!config) {
    if (id !== null) write(jsonRpcError(id, 'Configuração do MCP do TickTask não encontrada.'))
    return
  }

  if (!config.enabled) {
    if (id !== null) {
      write(jsonRpcError(id, 'Servidor MCP desligado — ative-o em Configurações no TickTask.'))
    }
    return
  }

  try {
    const reply = await send(config, frame)

    if (reply.status === 401) {
      if (id !== null) {
        write(
          jsonRpcError(id, 'Token do MCP recusado — copie o comando atualizado em Configurações.')
        )
      }
      return
    }

    const payload = extractPayload(reply.contentType, reply.body)
    if (payload) write(payload)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido'
    if (id !== null) {
      write(jsonRpcError(id, `Não foi possível falar com o TickTask (${detail}).`))
    }
  }
}

let buffer = ''
let inputEnded = false
const pending = new Set<Promise<void>>()

// Sair no 'end' do stdin sem esperar o que está em voo descartaria a resposta da última
// chamada — o cliente ficaria sem retorno para uma requisição que o servidor já atendeu.
function exitWhenDrained(): void {
  if (inputEnded && pending.size === 0) process.exit(0)
}

function track(work: Promise<void>): void {
  pending.add(work)
  void work.finally(() => {
    pending.delete(work)
    exitWhenDrained()
  })
}

process.stdin.setEncoding('utf-8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  const { frames, rest } = splitFrames(buffer)
  buffer = rest
  for (const frame of frames) {
    track(handleFrame(frame))
  }
})

process.stdin.on('end', () => {
  inputEnded = true
  exitWhenDrained()
})
