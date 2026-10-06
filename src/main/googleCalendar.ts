import { app, safeStorage, shell } from 'electron'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { GcalStatus, Task } from '@shared/types'
import { getTask, getTimeBlocksForTask, listGcalSyncedTaskIds } from './database'
import { buildDesiredEvents, type GcalTaskInput } from './gcalPlan'
import { createKeyedQueue } from './gcalSyncQueue'
import { createCalendarApi, reconcileTaskEvents } from './googleCalendarApi'
import {
  GoogleAuthRevokedError,
  buildAuthUrl,
  createPkcePair,
  exchangeCode,
  refreshAccessToken,
  revokeToken
} from './googleOAuth'

const CALENDAR_NAME = 'TickTask'
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

interface StoredConfig {
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  tokenEncrypted?: boolean
  calendarId?: string
  autoSync?: boolean
}

const configPath = (): string => path.join(app.getPath('userData'), 'gcal-config.json')

let accessToken: { token: string; expiresAt: number } | null = null

function readConfig(): StoredConfig {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as StoredConfig
  } catch {
    return {}
  }
}

function writeConfig(config: StoredConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2))
}

function updateConfig(patch: Partial<StoredConfig>): StoredConfig {
  const next = { ...readConfig(), ...patch }
  writeConfig(next)
  return next
}

function sealToken(token: string): Pick<StoredConfig, 'refreshToken' | 'tokenEncrypted'> {
  if (!safeStorage.isEncryptionAvailable()) return { refreshToken: token, tokenEncrypted: false }
  return { refreshToken: safeStorage.encryptString(token).toString('base64'), tokenEncrypted: true }
}

let openedToken: { sealed: string; token: string | null } | null = null

function openToken(config: StoredConfig): string | null {
  if (!config.refreshToken) return null
  if (!config.tokenEncrypted) return config.refreshToken
  if (openedToken?.sealed !== config.refreshToken) {
    let token: string | null
    try {
      token = safeStorage.decryptString(Buffer.from(config.refreshToken, 'base64'))
    } catch {
      token = null
    }
    openedToken = { sealed: config.refreshToken, token }
  }
  return openedToken.token
}

function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function isConnected(config: StoredConfig): boolean {
  return Boolean(config.clientId && config.clientSecret && openToken(config))
}

export function isGcalConnected(): boolean {
  return isConnected(readConfig())
}

export function getGcalStatus(): GcalStatus {
  const config = readConfig()
  return {
    clientId: config.clientId ?? '',
    hasClientSecret: Boolean(config.clientSecret),
    connected: isConnected(config),
    autoSync: config.autoSync ?? true
  }
}

export function isGcalAutoSyncOn(): boolean {
  const config = readConfig()
  return isConnected(config) && (config.autoSync ?? true)
}

export function saveGcalCredentials(clientId: string, clientSecret: string): GcalStatus {
  const config = readConfig()
  const trimmedId = clientId.trim()
  const clientChanged = trimmedId !== config.clientId
  updateConfig({
    clientId: trimmedId,
    clientSecret: clientSecret.trim() || config.clientSecret,
    ...(clientChanged ? { refreshToken: undefined, tokenEncrypted: undefined } : {})
  })
  if (clientChanged) accessToken = null
  return getGcalStatus()
}

export function setGcalAutoSync(enabled: boolean): GcalStatus {
  updateConfig({ autoSync: enabled })
  return getGcalStatus()
}

async function getAccessToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh && accessToken && accessToken.expiresAt - 60_000 > Date.now()) {
    return accessToken.token
  }
  const config = readConfig()
  const refreshToken = openToken(config)
  if (!config.clientId || !config.clientSecret || !refreshToken) {
    throw new Error('Google Calendar não está conectado.')
  }
  try {
    const refreshed = await refreshAccessToken(
      fetch,
      { clientId: config.clientId, clientSecret: config.clientSecret, refreshToken },
      Date.now()
    )
    accessToken = { token: refreshed.accessToken, expiresAt: refreshed.expiresAt }
    return refreshed.accessToken
  } catch (error) {
    if (error instanceof GoogleAuthRevokedError) {
      accessToken = null
      updateConfig({ refreshToken: undefined, tokenEncrypted: undefined })
    }
    throw error
  }
}

const api = createCalendarApi({ fetch, getAccessToken })

let recreating: Promise<string> | null = null

// Várias tasks podem descobrir ao mesmo tempo que a agenda sumiu; sem isto cada uma criaria a sua.
function recreateCalendar(failedId: string | undefined): Promise<string> {
  const current = readConfig().calendarId
  if (current && current !== failedId) return Promise.resolve(current)
  recreating ??= api
    .createCalendar(CALENDAR_NAME, systemTimeZone())
    .then((calendarId) => {
      updateConfig({ calendarId })
      return calendarId
    })
    .finally(() => {
      recreating = null
    })
  return recreating
}

function waitForAuthCode(
  state: string
): Promise<{ redirectUri: string; code: Promise<string>; close: () => void }> {
  return new Promise((resolveServer, rejectServer) => {
    let settle: { resolve: (code: string) => void; reject: (error: Error) => void }
    const code = new Promise<string>((resolve, reject) => (settle = { resolve, reject }))
    code.catch(() => undefined)

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const error = url.searchParams.get('error')
      const received = url.searchParams.get('code')
      // Só a resposta com o state desta tentativa conta; qualquer outra requisição local que
      // chegue na porta não pode encerrar o login.
      if ((!error && !received) || url.searchParams.get('state') !== state) {
        res.writeHead(400).end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<p style="font-family:sans-serif">Pode fechar esta aba e voltar ao TickTask.</p>')
      if (error) settle.reject(new Error(`O Google recusou a autorização: ${error}`))
      else settle.resolve(received!)
    })

    const timer = setTimeout(
      () => settle.reject(new Error('Tempo esgotado esperando a autorização do Google.')),
      LOGIN_TIMEOUT_MS
    )
    const close = (): void => {
      clearTimeout(timer)
      server.close()
    }

    server.on('error', rejectServer)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolveServer({ redirectUri: `http://127.0.0.1:${port}`, code, close })
    })
  })
}

export async function connectGcal(): Promise<GcalStatus> {
  const config = readConfig()
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Informe o Client ID e o Client Secret antes de conectar.')
  }

  const state = randomBytes(16).toString('hex')
  const pkce = createPkcePair()
  const listener = await waitForAuthCode(state)
  try {
    await shell.openExternal(
      buildAuthUrl({
        clientId: config.clientId,
        redirectUri: listener.redirectUri,
        codeChallenge: pkce.challenge,
        state
      })
    )
    const code = await listener.code
    const tokens = await exchangeCode(
      fetch,
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code,
        codeVerifier: pkce.verifier,
        redirectUri: listener.redirectUri
      },
      Date.now()
    )
    accessToken = { token: tokens.accessToken, expiresAt: tokens.expiresAt }
    updateConfig({ ...sealToken(tokens.refreshToken), autoSync: config.autoSync ?? true })
  } finally {
    listener.close()
  }

  if (!readConfig().calendarId) await recreateCalendar(undefined)
  return getGcalStatus()
}

export async function disconnectGcal(): Promise<GcalStatus> {
  const config = readConfig()
  const token = openToken(config)
  if (token) await revokeToken(fetch, token).catch(() => undefined)
  accessToken = null
  updateConfig({ refreshToken: undefined, tokenEncrypted: undefined })
  return getGcalStatus()
}

function toPlanInput(task: Task): GcalTaskInput {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    status: task.status,
    project_name: task.project_name,
    scheduled_date: task.scheduled_date,
    due_date: task.due_date,
    scheduled_time: task.scheduled_time,
    scheduled_end_time: task.scheduled_end_time,
    due_time: task.due_time,
    time_limit_seconds: task.time_limit_seconds,
    gcal_sync: Boolean(task.gcal_sync)
  }
}

async function runTaskSync(taskId: number): Promise<void> {
  const config = readConfig()
  if (!isConnected(config)) return
  const calendarId = config.calendarId ?? (await recreateCalendar(undefined))

  const task = getTask(taskId)
  const timeZone = systemTimeZone()
  await reconcileTaskEvents(api, {
    calendarId,
    taskId,
    desired: buildDesiredEvents(
      task ? toPlanInput(task) : null,
      task ? getTimeBlocksForTask(taskId) : [],
      timeZone
    ),
    timeZone,
    recreateCalendar: () => recreateCalendar(calendarId)
  })
}

export const syncTaskToGoogle = createKeyedQueue(runTaskSync)

export async function syncAllToGoogle(): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0
  for (const id of listGcalSyncedTaskIds()) {
    try {
      await syncTaskToGoogle(id)
      success++
    } catch (error) {
      if (error instanceof GoogleAuthRevokedError) throw error
      console.error(`[gcal] falha ao sincronizar a tarefa ${id}:`, error)
      failed++
    }
  }
  return { success, failed }
}
