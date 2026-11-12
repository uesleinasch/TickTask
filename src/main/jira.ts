import { app, safeStorage } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type {
  JiraCredentialsInput,
  JiraFieldInput,
  JiraFieldOption,
  JiraImportResult,
  JiraIssueFields,
  JiraKnownStatus,
  JiraOptionsInput,
  JiraSpace,
  JiraStatus,
  JiraTransitionOption,
  JiraUser,
  Task
} from '@shared/types'
import {
  createJiraLinkedTask,
  getJiraDescriptionState,
  getTask,
  listJiraLinkedTasks,
  listProjects,
  saveJiraDescriptionSync,
  updateJiraLinkedTask,
  type JiraLinkedTask
} from './database'
import { createKeyedQueue } from './gcalSyncQueue'
import { collectAdfMedia, parseDoc, prosemirrorToAdf, type DocNode } from './jiraAdf'
import { createJiraApi, type JiraApi, type JiraBoard, type JiraIssue } from './jiraApi'
import { describeIssueFields, isSprintField, toJiraValue } from './jiraFields'
import {
  buildIssueUrl,
  normalizeJiraSite,
  planDescriptionImport,
  planImport,
  type ImportOp,
  type SpaceProjects,
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
  knownSpaces?: JiraSpace[]
  spaceProjects?: SpaceProjects
  statusMapping?: StatusMapping
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

let openedToken: { sealed: string; token: string | null } | null = null

function openToken(config: StoredConfig): string | null {
  if (!config.apiToken) return null
  if (!config.tokenEncrypted) return config.apiToken
  if (openedToken?.sealed !== config.apiToken) {
    let token: string | null
    try {
      token = safeStorage.decryptString(Buffer.from(config.apiToken, 'base64'))
    } catch {
      token = null
    }
    openedToken = { sealed: config.apiToken, token }
  }
  return openedToken.token
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

const NOT_CONNECTED = 'Jira não está conectado. Preencha o site, e-mail e API token.'

function requireConnection(): Connection {
  const connection = currentConnection()
  if (!connection) throw new Error(NOT_CONNECTED)
  return connection
}

function requireApi(): JiraApi {
  return apiFor(requireConnection())
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
    knownSpaces: knownSpaces(config),
    spaceProjects: config.spaceProjects ?? {},
    statusMapping: config.statusMapping ?? {},
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
    ...(accountChanged
      ? { boardIds: [], boards: [], knownStatuses: [], knownSpaces: [], lastImportAt: null }
      : {})
  })
  return getJiraStatus()
}

export async function testJiraConnection(): Promise<JiraUser> {
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
  if (input.syncToNotion !== undefined) patch.syncToNotion = input.syncToNotion
  if (input.autoImportMinutes !== undefined) {
    patch.autoImportMinutes = Math.max(0, Math.round(input.autoImportMinutes))
  }
  if (input.projectId !== undefined) patch.projectId = input.projectId
  if (input.spaceProjects !== undefined) {
    patch.spaceProjects = Object.fromEntries(
      Object.entries(input.spaceProjects).filter(
        ([key, id]) => key && Number.isInteger(id) && id > 0
      )
    )
  }
  updateConfig(patch)
  return getJiraStatus()
}

export function jiraNotionFilter(): (task: Pick<Task, 'jira_key'>) => boolean {
  const syncJiraTasks = readConfig().syncToNotion ?? false
  return (task) => !task.jira_key || syncJiraTasks
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
    knownSpaces: [],
    lastImportAt: null
  })
  return getJiraStatus()
}

const IMPORT_TICK_MS = 60_000

export async function importJiraIssues(): Promise<JiraImportResult> {
  const config = readConfig()
  const connection = currentConnection(config)
  if (!connection) throw new Error(NOT_CONNECTED)
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
  const projects = existingProjects(config)
  const ops = planImport(
    issues,
    linked,
    connection.site,
    config.statusMapping ?? {},
    projects.spaceProjects
  )

  const taskIdByKey = new Map<string, number>()
  const changedIds = new Set<number>()
  for (const op of ops) {
    if (op.type === 'noop') taskIdByKey.set(op.key, op.id)
    else {
      const id = applyImportOp(op, projects.defaultProjectId)
      taskIdByKey.set(op.key, id)
      changedIds.add(id)
    }
  }
  for (const id of await importDescriptions(api, taskIdByKey)) changedIds.add(id)
  updateConfig({
    knownStatuses: collectKnownStatuses(issues),
    knownSpaces: mergeKnownSpaces(config.knownSpaces ?? [], issues)
  })
  const taskIds = [...changedIds]

  return {
    created: ops.filter((op) => op.type === 'create').length,
    updated: ops.filter((op) => op.type === 'update').length,
    unchanged: ops.filter((op) => op.type === 'noop').length,
    taskIds
  }
}

function existingProjects(config: StoredConfig): {
  spaceProjects: SpaceProjects
  defaultProjectId: number | null
} {
  const ids = new Set(listProjects().map((project) => project.id))
  const spaceProjects = Object.fromEntries(
    Object.entries(config.spaceProjects ?? {}).filter(([, id]) => ids.has(id))
  )
  const defaultProjectId = config.projectId && ids.has(config.projectId) ? config.projectId : null
  return { spaceProjects, defaultProjectId }
}

function knownSpaces(config: StoredConfig): JiraSpace[] {
  const byKey = new Map<string, JiraSpace>()
  for (const board of config.boards ?? []) {
    if (board.spaceKey && config.boardIds?.includes(board.id)) {
      byKey.set(board.spaceKey, { key: board.spaceKey, name: board.spaceName ?? board.spaceKey })
    }
  }
  for (const space of config.knownSpaces ?? []) byKey.set(space.key, space)
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function mergeKnownSpaces(previous: JiraSpace[], issues: JiraIssue[]): JiraSpace[] {
  const byKey = new Map(previous.map((space) => [space.key, space]))
  for (const issue of issues) {
    if (issue.spaceKey) {
      byKey.set(issue.spaceKey, { key: issue.spaceKey, name: issue.spaceName ?? issue.spaceKey })
    }
  }
  return [...byKey.values()]
}

function applyImportOp(
  op: Exclude<ImportOp, { type: 'noop' }>,
  defaultProjectId: number | null
): number {
  if (op.type === 'create') {
    const { fields } = op
    return createJiraLinkedTask(
      {
        name: fields.name,
        due_date: fields.due_date ?? undefined,
        external_url: fields.external_url,
        project_id: fields.project_id ?? defaultProjectId ?? undefined
      },
      {
        jiraKey: op.key,
        jiraStatus: fields.jira_status,
        jiraSpace: fields.jira_space,
        status: fields.status
      }
    )
  }
  updateJiraLinkedTask(op.id, op.patch)
  return op.id
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
    if (!minutes || !config.boardIds?.length || !currentConnection(config)) return
    const last = config.lastImportAt ? Date.parse(config.lastImportAt) : 0
    if (Date.now() - last >= minutes * 60_000) onDue()
  }, IMPORT_TICK_MS)
  return () => clearInterval(timer)
}

let reportBackgroundError: (error: unknown) => void = (error) =>
  console.error('[jira] erro em segundo plano:', error)

export function onJiraBackgroundError(handler: (error: unknown) => void): void {
  reportBackgroundError = handler
}

const sha1 = (text: string): string => createHash('sha1').update(text).digest('hex')
const hashDescription = (adf: DocNode | null): string => sha1(JSON.stringify(adf ?? null))
const hashNotes = (notes: string | null): string => sha1(notes ?? '')

async function importDescriptions(
  api: JiraApi,
  taskIdByKey: Map<string, number>
): Promise<number[]> {
  if (taskIdByKey.size === 0) return []
  const descriptions = await api.getDescriptions([...taskIdByKey.keys()])
  const changed: number[] = []
  for (const [key, taskId] of taskIdByKey) {
    if (!descriptions.has(key)) continue
    const state = getJiraDescriptionState(taskId)
    if (!state) continue
    const description = descriptions.get(key) ?? null
    const descHash = hashDescription(description)
    const plan = planDescriptionImport(description, descHash, state)
    switch (plan.type) {
      case 'none':
        break
      case 'replace':
        saveJiraDescriptionSync(taskId, {
          descHash,
          notesHash: hashNotes(plan.notes),
          notes: plan.notes
        })
        changed.push(taskId)
        break
      case 'merge':
        saveJiraDescriptionSync(taskId, { descHash, notesHash: '', notes: plan.notes })
        changed.push(taskId)
        scheduleJiraDescriptionPush(taskId)
        break
      case 'push':
        saveJiraDescriptionSync(taskId, { descHash, notesHash: '' })
        scheduleJiraDescriptionPush(taskId)
        break
    }
  }
  return changed
}

async function pushDescription(taskId: number): Promise<void> {
  const state = getJiraDescriptionState(taskId)
  if (!state?.jira_key || state.jira_desc_hash === null) return
  const notesHash = hashNotes(state.notes)
  if (notesHash === state.jira_notes_hash) return
  const connection = currentConnection()
  if (!connection) return

  const api = apiFor(connection)
  const [current] = (await api.getDescriptions([state.jira_key])).values()
  const description = prosemirrorToAdf(parseDoc(state.notes), collectAdfMedia(current ?? null))
  await api.updateIssue(state.jira_key, { description })
  const [saved] = (await api.getDescriptions([state.jira_key])).values()
  saveJiraDescriptionSync(taskId, { descHash: hashDescription(saved ?? null), notesHash })
}

const runDescriptionPush = createKeyedQueue(pushDescription)
const DESCRIPTION_PUSH_DELAY_MS = 2000
const pendingDescriptionPush = new Map<number, ReturnType<typeof setTimeout>>()

function needsDescriptionPush(taskId: number): boolean {
  const state = getJiraDescriptionState(taskId)
  return (
    !!state?.jira_key &&
    state.jira_desc_hash !== null &&
    hashNotes(state.notes) !== state.jira_notes_hash
  )
}

export function scheduleJiraDescriptionPush(taskId: number): void {
  if (!needsDescriptionPush(taskId)) return
  clearTimeout(pendingDescriptionPush.get(taskId))
  pendingDescriptionPush.set(
    taskId,
    setTimeout(() => {
      pendingDescriptionPush.delete(taskId)
      runDescriptionPush(taskId).catch(reportBackgroundError)
    }, DESCRIPTION_PUSH_DELAY_MS)
  )
}

function linkedIssueKey(taskId: number): string {
  const key = getTask(taskId)?.jira_key
  if (!key) throw new Error('Esta task não está vinculada ao Jira.')
  return key
}

async function refreshLinkedTask(
  api: JiraApi,
  connection: Connection,
  taskId: number
): Promise<void> {
  const existing = listJiraLinkedTasks().find((task) => task.id === taskId)
  if (!existing) return
  const issue = await api.getIssue(existing.jira_key)
  const config = readConfig()
  const [op] = planImport(
    [issue],
    new Map([[issue.key, existing]]),
    connection.site,
    config.statusMapping ?? {},
    existingProjects(config).spaceProjects
  )
  if (op?.type === 'update') updateJiraLinkedTask(op.id, op.patch)
}

export async function listJiraTransitions(taskId: number): Promise<JiraTransitionOption[]> {
  const transitions = await requireApi().listTransitions(linkedIssueKey(taskId))
  return transitions.map((t) => ({ id: t.id, name: t.toName, category: t.toCategory }))
}

export async function transitionJiraIssue(taskId: number, transitionId: string): Promise<void> {
  const connection = requireConnection()
  const api = apiFor(connection)
  await api.doTransition(linkedIssueKey(taskId), transitionId)
  await refreshLinkedTask(api, connection, taskId)
}

let cachedMe: { account: string; me: JiraUser } | null = null

async function currentUser(api: JiraApi, connection: Connection): Promise<JiraUser | null> {
  const account = `${connection.site}|${connection.email}`
  if (cachedMe?.account !== account) {
    try {
      cachedMe = { account, me: await api.getMyself() }
    } catch {
      return null
    }
  }
  return cachedMe.me
}

async function sprintOptions(
  api: JiraApi,
  issue: { fields: Record<string, unknown> },
  sprintFieldIds: string[]
): Promise<JiraFieldOption[]> {
  if (sprintFieldIds.length === 0) return []
  const boardIds = new Set(readConfig().boardIds ?? [])
  for (const id of sprintFieldIds) {
    const value = issue.fields[id]
    if (!Array.isArray(value)) continue
    for (const sprint of value as { boardId?: number }[]) {
      if (typeof sprint?.boardId === 'number') boardIds.add(sprint.boardId)
    }
  }
  const options = new Map<string, JiraFieldOption>()
  for (const boardId of boardIds) {
    const sprints = await api.listOpenSprints(boardId).catch(() => [])
    for (const sprint of sprints) {
      const label = sprint.state === 'active' ? `${sprint.name} (ativa)` : sprint.name
      options.set(String(sprint.id), { id: String(sprint.id), label })
    }
  }
  return [...options.values()]
}

export async function getJiraIssueFields(taskId: number): Promise<JiraIssueFields> {
  const connection = requireConnection()
  const api = apiFor(connection)
  const key = linkedIssueKey(taskId)
  const raw = await api.getIssueWithEditMeta(key)
  const meta = raw.editmeta?.fields ?? {}
  const sprintIds = Object.keys(meta).filter((id) => isSprintField(meta[id]))
  const status = raw.fields.status as { name?: string } | undefined
  return {
    key,
    url: buildIssueUrl(connection.site, key),
    statusName: status?.name ?? '',
    fields: describeIssueFields(raw, await sprintOptions(api, raw, sprintIds)),
    me: await currentUser(api, connection)
  }
}

export async function updateJiraIssueField(
  taskId: number,
  fieldId: string,
  input: JiraFieldInput
): Promise<JiraIssueFields> {
  const connection = requireConnection()
  const api = apiFor(connection)
  const key = linkedIssueKey(taskId)
  const field = describeIssueFields(await api.getIssueWithEditMeta(key)).find(
    (f) => f.id === fieldId
  )
  if (!field) throw new Error('Este campo não pode ser editado nesta issue.')
  await api.updateIssue(key, { [fieldId]: toJiraValue(field, input) })
  await refreshLinkedTask(api, connection, taskId)
  return getJiraIssueFields(taskId)
}

export async function searchJiraUsers(
  taskId: number,
  fieldId: string,
  query: string
): Promise<JiraUser[]> {
  const key = linkedIssueKey(taskId)
  return requireApi().searchUsers(query, fieldId === 'assignee' ? key : undefined)
}
