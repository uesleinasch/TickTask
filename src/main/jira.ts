import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type {
  JiraCredentialsInput,
  JiraKnownStatus,
  JiraOptionsInput,
  JiraStatus
} from '@shared/types'
import { createJiraApi, type JiraApi, type JiraBoard } from './jiraApi'
import { normalizeJiraSite, type StatusMapping } from './jiraPlan'

interface StoredConfig {
  site?: string
  email?: string
  apiToken?: string
  tokenEncrypted?: boolean
  boardIds?: number[]
  boards?: JiraBoard[]
  knownStatuses?: JiraKnownStatus[]
  statusMapping?: StatusMapping
  pushStatus?: boolean
  syncToNotion?: boolean
  autoImportMinutes?: number
  projectId?: number | null
  lastImportAt?: string | null
}

const configPath = (): string => path.join(app.getPath('userData'), 'jira-config.json')

function readConfig(): StoredConfig {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as StoredConfig
  } catch {
    return {}
  }
}

function updateConfig(patch: Partial<StoredConfig>): StoredConfig {
  const next = { ...readConfig(), ...patch }
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2))
  return next
}

function sealToken(token: string): Pick<StoredConfig, 'apiToken' | 'tokenEncrypted'> {
  if (!safeStorage.isEncryptionAvailable()) return { apiToken: token, tokenEncrypted: false }
  return {
    apiToken: safeStorage.encryptString(token).toString('base64'),
    tokenEncrypted: true
  }
}

function openToken(config: StoredConfig): string | null {
  if (!config.apiToken) return null
  if (!config.tokenEncrypted) return config.apiToken
  try {
    return safeStorage.decryptString(Buffer.from(config.apiToken, 'base64'))
  } catch {
    return null
  }
}

interface Connection {
  site: string
  email: string
  token: string
}

function currentConnection(config: StoredConfig = readConfig()): Connection | null {
  const token = openToken(config)
  if (!config.site || !config.email || !token) return null
  return { site: config.site, email: config.email, token }
}

function apiFor(connection: Connection): JiraApi {
  const credentials = Buffer.from(`${connection.email}:${connection.token}`).toString('base64')
  return createJiraApi({
    site: connection.site,
    authorization: `Basic ${credentials}`,
    fetch
  })
}

function requireApi(): JiraApi {
  const connection = currentConnection()
  if (!connection) throw new Error('Jira não está conectado. Preencha o site, e-mail e API token.')
  return apiFor(connection)
}

export function getJiraStatus(): JiraStatus {
  const config = readConfig()
  return {
    site: config.site ?? '',
    email: config.email ?? '',
    hasToken: Boolean(config.apiToken),
    connected: currentConnection(config) !== null,
    boardIds: config.boardIds ?? [],
    boards: config.boards ?? [],
    knownStatuses: config.knownStatuses ?? [],
    statusMapping: config.statusMapping ?? {},
    pushStatus: config.pushStatus ?? false,
    syncToNotion: config.syncToNotion ?? false,
    autoImportMinutes: config.autoImportMinutes ?? 0,
    projectId: config.projectId ?? null,
    lastImportAt: config.lastImportAt ?? null
  }
}

export function saveJiraCredentials(input: JiraCredentialsInput): JiraStatus {
  const site = normalizeJiraSite(input.site)
  if (!site) throw new Error('Informe um site Jira Cloud, ex.: sua-empresa.atlassian.net')
  const email = input.email.trim()
  if (!email) throw new Error('Informe o e-mail da conta Atlassian.')

  const config = readConfig()
  const accountChanged = site !== config.site || email !== config.email
  const token = input.apiToken.trim()
  if (accountChanged && !token) {
    throw new Error('Ao trocar site ou e-mail, informe o API token novamente.')
  }

  updateConfig({
    site,
    email,
    ...(token ? sealToken(token) : {}),
    ...(accountChanged ? { boardIds: [], boards: [], knownStatuses: [], lastImportAt: null } : {})
  })
  return getJiraStatus()
}

export async function testJiraConnection(): Promise<{ displayName: string }> {
  return requireApi().getMyself()
}

export async function listJiraBoards(): Promise<JiraBoard[]> {
  const boards = await requireApi().listBoards()
  updateConfig({ boards })
  return boards
}

export function saveJiraBoards(boardIds: number[]): JiraStatus {
  updateConfig({ boardIds: [...new Set(boardIds)] })
  return getJiraStatus()
}

export function saveJiraMapping(mapping: StatusMapping): JiraStatus {
  updateConfig({ statusMapping: mapping })
  return getJiraStatus()
}

export function saveJiraOptions(input: JiraOptionsInput): JiraStatus {
  const patch: Partial<StoredConfig> = {}
  if (input.pushStatus !== undefined) patch.pushStatus = input.pushStatus
  if (input.syncToNotion !== undefined) patch.syncToNotion = input.syncToNotion
  if (input.autoImportMinutes !== undefined) {
    patch.autoImportMinutes = Math.max(0, Math.round(input.autoImportMinutes))
  }
  if (input.projectId !== undefined) patch.projectId = input.projectId
  updateConfig(patch)
  return getJiraStatus()
}

export function disconnectJira(): JiraStatus {
  updateConfig({
    site: undefined,
    email: undefined,
    apiToken: undefined,
    tokenEncrypted: undefined,
    boardIds: [],
    boards: [],
    knownStatuses: [],
    lastImportAt: null
  })
  return getJiraStatus()
}
