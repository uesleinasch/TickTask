import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type {
  Task,
  JiraCredentialsInput,
  JiraImportResult,
  TaskStatus,
  JiraKnownStatus,
  JiraOptionsInput,
  JiraStatus
} from '@shared/types'
import {
  createJiraLinkedTask,
  getTask,
  listJiraLinkedTasks,
  updateTask,
  type JiraLinkedTask
} from './database'
import { createKeyedQueue } from './gcalSyncQueue'
import { createJiraApi, type JiraApi, type JiraBoard, type JiraIssue } from './jiraApi'
import {
  mapJiraStatusToLocal,
  normalizeJiraSite,
  pickTransition,
  planImport,
  resolveJiraTarget,
  type ImportOp,
  type StatusMapping
} from './jiraPlan'

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

export function jiraAllowsNotionSync(task: Pick<Task, 'jira_key'>): boolean {
  return !task.jira_key || (readConfig().syncToNotion ?? false)
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

const IMPORT_TICK_MS = 60_000

export async function importJiraIssues(): Promise<JiraImportResult> {
  const config = readConfig()
  const connection = currentConnection(config)
  if (!connection) throw new Error('Jira não está conectado. Preencha o site, e-mail e API token.')
  if (!config.boardIds?.length) throw new Error('Escolha ao menos um board antes de importar.')

  updateConfig({ lastImportAt: new Date().toISOString() })
  const api = apiFor(connection)
  const issuesByKey = new Map<string, JiraIssue>()
  for (const boardId of config.boardIds) {
    for (const issue of await api.listAssignedBoardIssues(boardId)) {
      issuesByKey.set(issue.key, issue)
    }
  }
  const issues = [...issuesByKey.values()]

  const linked = new Map<string, JiraLinkedTask>()
  for (const task of listJiraLinkedTasks()) linked.set(task.jira_key, task)
  const ops = planImport(issues, linked, connection.site, config.statusMapping ?? {})

  const taskIds = ops
    .filter((op) => op.type !== 'noop')
    .map((op) => applyImportOp(op, config.projectId))
  updateConfig({ knownStatuses: collectKnownStatuses(issues) })

  return {
    created: ops.filter((op) => op.type === 'create').length,
    updated: ops.filter((op) => op.type === 'update').length,
    unchanged: ops.filter((op) => op.type === 'noop').length,
    taskIds
  }
}

function applyImportOp(op: ImportOp, projectId: number | null | undefined): number {
  const fields = {
    name: op.issue.summary,
    due_date: op.issue.dueDate,
    status: op.status,
    external_url: op.url
  }
  if (op.type === 'create') {
    return createJiraLinkedTask(
      {
        name: fields.name,
        due_date: fields.due_date ?? undefined,
        external_url: fields.external_url,
        project_id: projectId ?? undefined
      },
      op.issue.key,
      op.status
    )
  }
  updateTask(op.existingId!, fields)
  return op.existingId!
}

function collectKnownStatuses(issues: JiraIssue[]): JiraKnownStatus[] {
  const byName = new Map<string, JiraKnownStatus>()
  for (const issue of issues) {
    if (!byName.has(issue.statusName)) {
      byName.set(issue.statusName, { name: issue.statusName, category: issue.statusCategory })
    }
  }
  return [...byName.values()]
}

export function startJiraScheduler(onDue: () => void): () => void {
  const timer = setInterval(() => {
    const config = readConfig()
    const minutes = config.autoImportMinutes ?? 0
    if (!minutes || !currentConnection(config)) return
    const last = config.lastImportAt ? Date.parse(config.lastImportAt) : 0
    if (Date.now() - last >= minutes * 60_000) onDue()
  }, IMPORT_TICK_MS)
  return () => clearInterval(timer)
}

const lastSyncedStatus = new Map<number, TaskStatus>()

async function pushStatusToJira(taskId: number): Promise<void> {
  const config = readConfig()
  const connection = currentConnection(config)
  if (!config.pushStatus || !connection) return
  const task = getTask(taskId)
  if (!task?.jira_key || lastSyncedStatus.get(taskId) === task.status) return

  const mapping = config.statusMapping ?? {}
  const target = resolveJiraTarget(task.status, mapping)
  if (!target) {
    lastSyncedStatus.set(taskId, task.status)
    return
  }

  const api = apiFor(connection)
  const current = await api.getIssueStatus(task.jira_key)
  if (mapJiraStatusToLocal(current, mapping) !== task.status) {
    const transition = pickTransition(await api.listTransitions(task.jira_key), target)
    if (!transition) {
      const wanted = target.name ?? `categoria ${target.category}`
      throw new Error(`O Jira não tem transição de "${current.statusName}" para ${wanted}.`)
    }
    await api.doTransition(task.jira_key, transition.id)
  }
  lastSyncedStatus.set(taskId, task.status)
}

const schedulePush = createKeyedQueue(pushStatusToJira)

export function scheduleJiraStatusPush(taskId: number): Promise<void> {
  return schedulePush(taskId)
}
