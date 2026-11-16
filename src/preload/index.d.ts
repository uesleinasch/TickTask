import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  GcalStatus,
  TerminalBuffer,
  TerminalCreateResult,
  TerminalSession,
  TerminalTabCustomization,
  JiraBoardSummary,
  JiraCredentialsInput,
  JiraFieldInput,
  JiraImportResult,
  JiraChildrenResult,
  JiraIssueFields,
  JiraOptionsInput,
  JiraStatus,
  JiraTransitionOption,
  JiraUser,
  Task,
  TimeEntry,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Tag,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
  Context,
  WeeklyReview,
  ReviewHealthIndicators,
  TaskDependency,
  Area,
  CreateAreaInput,
  UpdateAreaInput,
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  TimeBlock,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  GtdMetrics,
  EnergyStats,
  TaskListFilters,
  TaskListItem,
  TagWithUsage,
  UpdateTagInput,
  McpStatus,
  BackupSnapshot,
  BackupStatus,
  NotesOwner,
  Notebook,
  NotebookSection,
  NotebookPage,
  NotebookPageSummary,
  CreateNotebookInput,
  UpdateNotebookInput,
  CreateSectionInput,
  UpdateSectionInput,
  CreatePageInput,
  MovePageInput,
  PageLocation,
  PageSearchResult
} from '../shared/types'

interface FloatTimerData {
  taskId: number
  taskName: string
  seconds: number
}

interface DailyStats {
  date: string
  dayOfWeek: number
  totalSeconds: number
}

interface TaskTimeStats {
  taskId: number
  taskName: string
  totalSeconds: number
}

interface StatusStats {
  status: string
  totalSeconds: number
}

interface CategoryStats {
  category: string
  totalSeconds: number
  taskCount: number
}

interface HeatmapData {
  date: string
  count: number
}

interface GeneralStats {
  totalTasks: number
  completedTasks: number
  totalTimeSeconds: number
  totalSessions: number
  avgSessionSeconds: number
}

interface NotionConfig {
  apiKey: string
  pageId?: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

interface API {
  // Window controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // Cadernos
  listNotebooks: () => Promise<Notebook[]>
  createNotebook: (input: CreateNotebookInput) => Promise<Notebook>
  updateNotebook: (id: number, input: UpdateNotebookInput) => Promise<void>
  deleteNotebook: (id: number) => Promise<void>
  reorderNotebooks: (ids: number[]) => Promise<void>
  listSections: (notebookId: number) => Promise<NotebookSection[]>
  createSection: (input: CreateSectionInput) => Promise<NotebookSection>
  updateSection: (id: number, input: UpdateSectionInput) => Promise<void>
  deleteSection: (id: number) => Promise<void>
  reorderSections: (notebookId: number, ids: number[]) => Promise<void>
  listPages: (sectionId: number) => Promise<NotebookPageSummary[]>
  getPage: (id: number) => Promise<NotebookPage | null>
  createPage: (input: CreatePageInput) => Promise<NotebookPage>
  updatePageTitle: (id: number, title: string) => Promise<void>
  deletePage: (id: number) => Promise<void>
  movePage: (id: number, input: MovePageInput) => Promise<void>
  savePageNotes: (id: number, notes: string | null) => Promise<void>
  savePageDrawing: (id: number, drawing: string | null, preview: Uint8Array | null) => Promise<void>
  searchPages: (query: string) => Promise<PageSearchResult[]>
  locatePage: (id: number) => Promise<PageLocation | null>
  exportPageLocal: (id: number) => Promise<string | null>
  exportNotebookLocal: (id: number) => Promise<{ dir: string; pages: number } | null>
  syncNotebookPageToNotion: (id: number) => Promise<void>
  syncNotebookToNotion: (id: number) => Promise<void>
  onNotebooksRefresh: (callback: () => void) => () => void

  // Task CRUD
  createTask: (data: CreateTaskInput) => Promise<Task>
  listTasks: (filters?: TaskListFilters) => Promise<Task[]>
  countTasks: (filters?: TaskListFilters) => Promise<number>
  listActiveTasksLight: () => Promise<TaskListItem[]>
  listRunningTasks: () => Promise<Task[]>
  getTask: (id: number) => Promise<Task | undefined>
  updateTask: (id: number, data: UpdateTaskInput) => Promise<void>
  updateTaskNotes: (id: number, notes: string | null) => Promise<void>
  saveDrawing: (id: number, drawing: string | null, preview: Uint8Array | null) => Promise<void>
  searchMentions: (
    query: string
  ) => Promise<Array<{ id: number; label: string; type: 'task' | 'project' | 'context' | 'page' }>>
  saveNoteImage: (
    owner: NotesOwner,
    bytes: Uint8Array,
    filename: string,
    mime: string
  ) => Promise<{ assetId: string; src: string }>
  exportNotesLocalChoose: (taskId: number) => Promise<string | null>
  exportNotesLocal: (taskId: number) => Promise<boolean>
  syncTaskNotes: (id: number) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  bulkDeleteTasks: (ids: number[]) => Promise<void>
  bulkUpdateStatus: (ids: number[], status: TaskStatus) => Promise<void>
  bulkMoveToProject: (ids: number[], projectId: number | null) => Promise<void>
  archiveTask: (id: number) => Promise<void>
  unarchiveTask: (id: number) => Promise<void>
  bulkSetArchived: (ids: number[], archived: boolean) => Promise<void>
  startTask: (id: number) => Promise<void>
  stopTask: (id: number) => Promise<void>
  updateTimer: (id: number, seconds: number) => Promise<void>
  resetTask: (id: number) => Promise<void>
  addManualTime: (id: number, seconds: number) => Promise<void>
  setTotalTime: (id: number, seconds: number) => Promise<void>
  updateStatus: (id: number, status: TaskStatus) => Promise<void>
  getTimeEntries: (taskId: number) => Promise<TimeEntry[]>
  getActiveTimeEntry: (taskId: number) => Promise<TimeEntry | undefined>
  showNotification: (title: string, body: string) => void

  // Float window controls
  updateFloatTimer: (timers: FloatTimerData[]) => Promise<void>
  clearFloatTimer: () => Promise<void>
  restoreFromFloat: () => Promise<void>
  stopFromFloat: (taskId: number) => Promise<void>
  stopAllFromFloat: () => Promise<void>
  onFloatUpdate: (callback: (timers: FloatTimerData[]) => void) => () => void
  onFloatClear: (callback: () => void) => () => void
  onTimerStopped: (callback: (taskId: number) => void) => () => void

  // Tasks refresh event
  onTasksRefresh: (callback: () => void) => () => void

  // Statistics
  getWeeklyStats: () => Promise<DailyStats[]>
  getTaskTimeStats: () => Promise<TaskTimeStats[]>
  getStatusStats: () => Promise<StatusStats[]>
  getCategoryStats: () => Promise<CategoryStats[]>
  getHeatmapData: () => Promise<HeatmapData[]>
  getGeneralStats: () => Promise<GeneralStats>
  // FASE 4.2: Advanced stats
  getGtdMetrics: () => Promise<GtdMetrics>
  getEnergyStats: () => Promise<EnergyStats[]>
  generateWeeklyPDF: () => Promise<void>

  // Tags
  createTag: (name: string, color?: string) => Promise<Tag>
  listTags: () => Promise<Tag[]>
  listTagsWithUsage: () => Promise<TagWithUsage[]>
  updateTag: (id: number, data: UpdateTagInput) => Promise<void>
  mergeTags: (sourceId: number, targetId: number) => Promise<number>
  getOrCreateTag: (name: string) => Promise<Tag>
  deleteTag: (id: number) => Promise<void>
  getTaskTags: (taskId: number) => Promise<Tag[]>
  setTaskTags: (taskId: number, tagIds: number[]) => Promise<void>

  // Projects
  createProject: (data: CreateProjectInput) => Promise<Project>
  getProject: (id: number) => Promise<Project | undefined>
  listProjects: (status?: ProjectStatus) => Promise<Project[]>
  updateProject: (id: number, data: UpdateProjectInput) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  getProjectTasks: (projectId: number) => Promise<Task[]>

  // Contexts
  createContext: (name: string, icon?: string, color?: string) => Promise<Context>
  listContexts: () => Promise<Context[]>
  updateContext: (
    id: number,
    data: { name?: string; icon?: string; color?: string }
  ) => Promise<void>
  deleteContext: (id: number) => Promise<void>
  getTaskContexts: (taskId: number) => Promise<Context[]>
  setTaskContexts: (taskId: number, contextIds: number[]) => Promise<void>

  // Weekly Reviews
  createWeeklyReview: () => Promise<WeeklyReview>
  getWeeklyReview: (id: number) => Promise<WeeklyReview | undefined>
  listWeeklyReviews: () => Promise<WeeklyReview[]>
  getLastWeeklyReview: () => Promise<WeeklyReview | undefined>
  updateWeeklyReview: (
    id: number,
    data: {
      inbox_cleared?: boolean
      notes?: string
      checklist_state?: string
      completed_at?: string
    }
  ) => Promise<void>
  getReviewHealthIndicators: () => Promise<ReviewHealthIndicators>

  // FASE 2: Subtarefas
  listSubtasks: (parentId: number) => Promise<Task[]>
  createSubtask: (data: { name: string; parent_task_id: number }) => Promise<Task>

  // FASE 2: Dependências
  getDependencies: (taskId: number) => Promise<TaskDependency[]>
  addDependency: (taskId: number, dependsOnId: number) => Promise<void>
  removeDependency: (taskId: number, dependsOnId: number) => Promise<void>

  // FASE 2: Agendamento
  getTasksForDate: (date: string) => Promise<Task[]>
  getWeeklySchedule: (startDate: string) => Promise<{ date: string; tasks: Task[] }[]>
  updateDayOrder: (taskId: number, order: number) => Promise<void>
  scheduleTaskForDate: (taskId: number, date: string | null) => Promise<void>

  // FASE 2: Eventos push
  onTaskUnblocked: (callback: (taskId: number, taskName: string) => void) => () => void

  // Quick Capture
  openQuickCapture: () => Promise<void>
  quickCapture: (name: string) => Promise<Task>
  closeQuickCapture: () => Promise<void>

  // Notion Integration
  notionGetConfig: () => Promise<NotionConfig | null>
  notionSaveConfig: (config: NotionConfig) => Promise<void>
  notionClearConfig: () => Promise<void>
  notionTestConnection: () => Promise<{ success: boolean; message: string }>
  notionSyncTask: (taskId: number) => Promise<string>
  notionSyncAllTasks: () => Promise<{ success: number; failed: number }>
  notionCreateDatabase: () => Promise<string>

  // Google Calendar
  jiraGetStatus: () => Promise<JiraStatus>
  jiraSaveCredentials: (input: JiraCredentialsInput) => Promise<JiraStatus>
  jiraTest: () => Promise<JiraUser>
  jiraListBoards: () => Promise<JiraBoardSummary[]>
  jiraSaveBoards: (boardIds: number[]) => Promise<JiraStatus>
  jiraSaveMapping: (mapping: Record<string, TaskStatus>) => Promise<JiraStatus>
  jiraSaveOptions: (input: JiraOptionsInput) => Promise<JiraStatus>
  jiraDisconnect: () => Promise<JiraStatus>
  jiraImportNow: () => Promise<JiraImportResult | null>
  jiraListTransitions: (taskId: number) => Promise<JiraTransitionOption[]>
  jiraTransition: (taskId: number, transitionId: string) => Promise<void>
  jiraGetFields: (taskId: number) => Promise<JiraIssueFields>
  jiraGetChildren: (taskId: number) => Promise<JiraChildrenResult>
  jiraUpdateField: (
    taskId: number,
    fieldId: string,
    value: JiraFieldInput
  ) => Promise<JiraIssueFields>
  jiraSearchUsers: (taskId: number, fieldId: string, query: string) => Promise<JiraUser[]>
  onJiraSync: (
    callback: (status: 'syncing' | 'success' | 'error', detail?: string) => void
  ) => () => void
  gcalGetStatus: () => Promise<GcalStatus>
  gcalSaveCredentials: (clientId: string, clientSecret: string) => Promise<GcalStatus>
  gcalConnect: () => Promise<GcalStatus>
  gcalDisconnect: () => Promise<GcalStatus>
  gcalSetAutoSync: (enabled: boolean) => Promise<GcalStatus>
  gcalSetTaskSync: (taskId: number, enabled: boolean) => Promise<void>
  gcalSyncTask: (taskId: number) => Promise<void>
  gcalSyncAll: () => Promise<{ success: number; failed: number }>
  onGcalSync: (
    callback: (status: 'syncing' | 'success' | 'error', detail?: string) => void
  ) => () => void

  // FASE 4.3: Blocos de Tempo
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  getTimeBlocksForDate: (date: string) => Promise<TimeBlock[]>
  getTimeBlocksForWeek: (startDate: string) => Promise<TimeBlock[]>
  getTimeBlocksForMonth: (yearMonth: string) => Promise<TimeBlock[]>
  updateTimeBlock: (id: number, data: UpdateTimeBlockInput) => Promise<void>
  deleteTimeBlock: (id: number) => Promise<void>

  // FASE 4: Áreas de Foco
  createArea: (data: CreateAreaInput) => Promise<Area>
  getArea: (id: number) => Promise<Area | undefined>
  listAreas: () => Promise<Area[]>
  updateArea: (id: number, data: UpdateAreaInput) => Promise<void>
  deleteArea: (id: number) => Promise<void>

  // FASE 4: Objetivos (Goals)
  createGoal: (data: CreateGoalInput) => Promise<Goal>
  getGoal: (id: number) => Promise<Goal | undefined>
  listGoals: (areaId?: number) => Promise<Goal[]>
  updateGoal: (id: number, data: UpdateGoalInput) => Promise<void>
  deleteGoal: (id: number) => Promise<void>

  // Sync notification events
  onSyncStart?: (callback: (event: unknown, taskName?: string) => void) => void
  offSyncStart?: (callback: (event: unknown, taskName?: string) => void) => void
  onSyncSuccess?: (callback: (event: unknown, taskName?: string) => void) => void
  offSyncSuccess?: (callback: (event: unknown, taskName?: string) => void) => void
  onSyncError?: (callback: (event: unknown, error?: string) => void) => void
  offSyncError?: (callback: (event: unknown, error?: string) => void) => void

  // Inicialização
  appGetVersion: () => Promise<string>
  appGetAutostart: () => Promise<boolean>
  appOpenExternal: (url: string) => Promise<void>
  appSetAutostart: (enabled: boolean) => Promise<boolean>

  // Backup
  backupGetStatus: () => Promise<BackupStatus>
  backupChooseFolder: () => Promise<BackupStatus | null>
  backupCreate: () => Promise<BackupSnapshot>
  backupChooseSnapshot: () => Promise<string | null>
  backupInspect: (dir: string) => Promise<BackupSnapshot>
  backupRestore: (dir: string) => Promise<void>

  // MCP Server
  mcpGetStatus: () => Promise<McpStatus>
  mcpSetEnabled: (enabled: boolean) => Promise<McpStatus>
  mcpRegenerateToken: () => Promise<McpStatus>

  // Terminal embutido
  terminalCreate: (
    taskId: number,
    options: { shell?: string | null; cols?: number; rows?: number }
  ) => Promise<TerminalCreateResult>
  terminalWrite: (id: string, data: string) => Promise<void>
  terminalResize: (id: string, cols: number, rows: number) => Promise<void>
  terminalDispose: (id: string) => Promise<void>
  terminalList: () => Promise<TerminalSession[]>
  terminalCustomize: (id: string, patch: TerminalTabCustomization) => Promise<TerminalSession | null>
  terminalGetBuffer: (id: string) => Promise<TerminalBuffer | null>
  terminalPickDirectory: (taskId: number) => Promise<string | null>
  terminalSetTaskWorkspace: (
    taskId: number,
    workspace: { working_dir?: string | null; start_command?: string | null }
  ) => Promise<void>
  onTerminalData: (callback: (id: string, chunk: string, seq: number) => void) => () => void
  onTerminalExit: (callback: (id: string, exitCode: number) => void) => () => void
  onTerminalRemoved: (callback: (id: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
