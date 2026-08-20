import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Input } from '@renderer/components/ui/input'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { toast } from '@renderer/components/ui/sonner'
import { TaskList } from '@renderer/components/TaskList'
import { TaskTable } from '@renderer/components/TaskTable'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks } from '@renderer/hooks/useTasks'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TaskGroups, type TaskGroup } from '@renderer/components/TaskGroups'
import { TaskKanban } from '@renderer/components/TaskKanban'
import { eventEmitter } from '@renderer/App'
import {
  STATUS_LABELS,
  type Task,
  type TaskStatus,
  type TaskCategory,
  type CreateTaskInput,
  type Tag,
  type Context,
  type Project,
  type TaskListFilters
} from '../../../shared/types'
import {
  ListTodo,
  Inbox,
  Hourglass,
  Calendar,
  Activity,
  CheckSquare,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  Lightbulb,
  Trash2,
  FolderInput,
  CheckCheck,
  Loader2,
  Lock,
  CalendarDays,
  Layers,
  Columns3
} from 'lucide-react'

type FilterStatus = TaskStatus | 'all'
type FilterCategory = TaskCategory | 'all'
type SortMode = 'updated' | 'due_date'
type ViewMode = 'cards' | 'table'
type BulkAction =
  | { type: 'delete' }
  | { type: 'status'; status: TaskStatus }
  | { type: 'project'; projectId: number | null }

interface TabItem {
  id: FilterStatus
  label: string
  icon: React.ElementType
}

const tabs: TabItem[] = [
  { id: 'all', label: 'Todas', icon: ListTodo },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'aguardando', label: 'Aguardando', icon: Hourglass },
  { id: 'proximas', label: 'Próximas', icon: Calendar },
  { id: 'executando', label: 'Executando', icon: Activity },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckSquare },
  { id: 'someday', label: 'Someday', icon: Lightbulb }
]

const CATEGORY_COLOR_MAP: Record<TaskCategory | 'all', string> = {
  all: '#64748b',
  urgente: '#ef4444',
  prioridade: '#f97316',
  normal: '#3b82f6',
  time_leak: '#eab308'
}

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = usePersistedState<FilterStatus>(
    'ticktask:taskListStatusFilter',
    'inbox'
  )
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<number | null>(null)
  const [contextFilter, setContextFilter] = useState<number | null>(null)
  const [projectFilter, setProjectFilter] = useState<number | null>(null)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [availableContexts, setAvailableContexts] = useState<Context[]>([])
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [viewMode, setViewMode] = usePersistedState<ViewMode>('ticktask:taskListViewMode', 'table')
  const [groupingEnabled, setGroupingEnabled] = usePersistedState<boolean>(
    'ticktask:taskListGrouping',
    false
  )
  const [groupBy, setGroupBy] = usePersistedState<'project' | 'context'>(
    'ticktask:taskListGroupBy',
    'project'
  )
  const [kanbanEnabled, setKanbanEnabled] = usePersistedState<boolean>(
    'ticktask:executandoKanban',
    false
  )
  const [showFilters, setShowFilters] = useState(false)
  const [blockedFilter, setBlockedFilter] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])
  const [bulkStatusValue, setBulkStatusValue] = useState<TaskStatus | 'none'>('none')
  const [bulkProjectValue, setBulkProjectValue] = useState<string>('none')
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const filters = useMemo<TaskListFilters>(
    () => ({
      archived: false,
      status: statusFilter,
      category: categoryFilter,
      projectId: projectFilter === -1 ? 'none' : projectFilter,
      tagId: tagFilter,
      contextId: contextFilter,
      search: searchQuery,
      blockedOnly: blockedFilter,
      sort: sortMode
    }),
    [
      statusFilter,
      categoryFilter,
      projectFilter,
      tagFilter,
      contextFilter,
      searchQuery,
      blockedFilter,
      sortMode
    ]
  )

  const { tasks, loading, error, createTask, refreshTasks } = useTasks(filters)
  const [totalTasks, setTotalTasks] = useState(0)

  // Carregar dados de filtros
  useEffect(() => {
    window.api.listTags().then(setAvailableTags).catch(console.error)
    window.api.listContexts().then(setAvailableContexts).catch(console.error)
    window.api.listProjects().then(setAvailableProjects).catch(console.error)
  }, [])

  // Total sem filtros, para o rodapé "mostrando N de M"
  useEffect(() => {
    window.api.countTasks({ archived: false }).then(setTotalTasks).catch(console.error)
  }, [tasks])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  // Listener para refresh vindo do quick capture
  useEffect(() => {
    const unsubscribe = window.api.onTasksRefresh(() => {
      refreshTasks()
    })
    return unsubscribe
  }, [refreshTasks])

  // Opções de filtros
  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas', color: CATEGORY_COLOR_MAP['all'] },
      { value: 'urgente', label: 'Urgente', color: CATEGORY_COLOR_MAP['urgente'] },
      { value: 'prioridade', label: 'Prioridade', color: CATEGORY_COLOR_MAP['prioridade'] },
      { value: 'normal', label: 'Normal', color: CATEGORY_COLOR_MAP['normal'] },
      { value: 'time_leak', label: 'Time Leak', color: CATEGORY_COLOR_MAP['time_leak'] }
    ],
    []
  )

  const tagOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas' },
      ...availableTags.map((tag) => ({
        value: String(tag.id),
        label: tag.name,
        color: tag.color
      }))
    ],
    [availableTags]
  )

  const contextOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos' },
      ...availableContexts.map((ctx) => ({
        value: String(ctx.id),
        label: `${ctx.icon} ${ctx.name}`,
        color: ctx.color
      }))
    ],
    [availableContexts]
  )

  const projectOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos' },
      { value: 'none', label: 'Sem projeto' },
      ...availableProjects.map((proj) => ({
        value: String(proj.id),
        label: proj.name
      }))
    ],
    [availableProjects]
  )

  const filteredTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const taskGroups = useMemo<TaskGroup[]>(() => {
    if (!groupingEnabled && !kanbanEnabled) return []

    if (groupBy === 'project') {
      const map = new Map<string, TaskGroup>()
      const noProject: Task[] = []
      for (const task of tasks) {
        if (task.project_id && task.project_name) {
          const key = `p:${task.project_id}`
          let group = map.get(key)
          if (!group) {
            group = { key, label: task.project_name, color: task.project_color, tasks: [] }
            map.set(key, group)
          }
          group.tasks.push(task)
        } else {
          noProject.push(task)
        }
      }
      const groups = Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR')
      )
      if (noProject.length > 0) {
        groups.push({ key: 'p:none', label: 'Sem projeto', tasks: noProject })
      }
      return groups
    }

    // groupBy === 'context' — task com múltiplos contextos aparece em todos os grupos
    const map = new Map<string, TaskGroup>()
    const noContext: Task[] = []
    for (const task of tasks) {
      const contexts = task.contexts ?? []
      if (contexts.length === 0) {
        noContext.push(task)
      } else {
        for (const ctx of contexts) {
          const key = `c:${ctx.id}`
          let group = map.get(key)
          if (!group) {
            group = { key, label: ctx.name, color: ctx.color, icon: ctx.icon, tasks: [] }
            map.set(key, group)
          }
          group.tasks.push(task)
        }
      }
    }
    const groups = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    if (noContext.length > 0) {
      groups.push({ key: 'c:none', label: 'Sem contexto', tasks: noContext })
    }
    return groups
  }, [groupingEnabled, kanbanEnabled, groupBy, tasks])
  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
  const selectedCount = selectedTaskIds.length

  useEffect(() => {
    setSelectedTaskIds((current) => {
      const allowedIds = new Set(filteredTaskIds)
      const next = current.filter((id) => allowedIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [filteredTaskIds])

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    tagFilter !== null ||
    contextFilter !== null ||
    projectFilter !== null ||
    blockedFilter ||
    sortMode !== 'updated'

  const clearFilters = (): void => {
    setCategoryFilter('all')
    setSearchQuery('')
    setTagFilter(null)
    setContextFilter(null)
    setProjectFilter(null)
    setBlockedFilter(false)
    setSortMode('updated')
  }

  const handleScheduleForToday = useCallback(
    async (taskId: number): Promise<void> => {
      const today = new Date().toISOString().split('T')[0]
      const task = tasks.find((t) => t.id === taskId)
      const isAlreadyToday = task?.scheduled_date === today
      try {
        await window.api.scheduleTaskForDate(taskId, isAlreadyToday ? null : today)
        await refreshTasks()
        toast.success(isAlreadyToday ? 'Removido do plano de hoje' : 'Adicionado ao plano de hoje')
      } catch (err) {
        console.error('Erro ao programar tarefa:', err)
        toast.error('Erro ao atualizar agendamento')
      }
    },
    [refreshTasks, tasks]
  )

  // Ouvir evento de nova tarefa do TitleBar
  useEffect(() => {
    const openDialog = (): void => setDialogOpen(true)
    eventEmitter.on('open-new-task-dialog', openDialog)
    return () => eventEmitter.off('open-new-task-dialog', openDialog)
  }, [])

  const handleCreateTask = useCallback(
    async (data: CreateTaskInput): Promise<void> => {
      const task = await createTask(data)
      navigate(`/task/${task.id}`)
    },
    [createTask, navigate]
  )

  const handleTaskClick = (taskId: number): void => {
    navigate(`/task/${taskId}`)
  }

  const toggleTaskSelection = useCallback((taskId: number, selected: boolean): void => {
    setSelectedTaskIds((current) => {
      if (selected) {
        if (current.includes(taskId)) return current
        return [...current, taskId]
      }
      return current.filter((id) => id !== taskId)
    })
  }, [])

  const toggleSelectAllVisible = useCallback(
    (selected: boolean): void => {
      if (!selected) {
        setSelectedTaskIds([])
        return
      }
      setSelectedTaskIds(filteredTaskIds)
    },
    [filteredTaskIds]
  )

  const openConfirm = (action: BulkAction): void => {
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos uma tarefa')
      return
    }
    setBulkAction(action)
    setConfirmOpen(true)
  }

  const handleBulkActionConfirm = useCallback(async (): Promise<void> => {
    if (!bulkAction || selectedCount === 0) return

    setBulkLoading(true)
    try {
      if (bulkAction.type === 'delete') {
        await window.api.bulkDeleteTasks(selectedTaskIds)
        toast.success(`${selectedCount} tarefa(s) deletada(s) com sucesso`)
      }

      if (bulkAction.type === 'status') {
        await window.api.bulkUpdateStatus(selectedTaskIds, bulkAction.status)
        toast.success(
          `${selectedCount} tarefa(s) marcadas como ${STATUS_LABELS[bulkAction.status]}`
        )
      }

      if (bulkAction.type === 'project') {
        await window.api.bulkMoveToProject(selectedTaskIds, bulkAction.projectId)
        const targetProjectName =
          bulkAction.projectId === null
            ? 'sem projeto'
            : availableProjects.find((project) => project.id === bulkAction.projectId)?.name ||
              'projeto selecionado'
        toast.success(`${selectedCount} tarefa(s) movidas para ${targetProjectName}`)
      }

      setSelectedTaskIds([])
      setConfirmOpen(false)
      setBulkAction(null)
      await refreshTasks()
    } catch (error) {
      console.error('Erro ao executar ação em massa:', error)
      toast.error('Não foi possível aplicar a ação em massa')
    } finally {
      setBulkLoading(false)
    }
  }, [bulkAction, selectedCount, selectedTaskIds, refreshTasks, availableProjects])

  const confirmDialogContent = useMemo(() => {
    if (!bulkAction) {
      return {
        title: 'Confirmar ação em massa',
        description: 'Confirme para continuar.',
        actionLabel: 'Confirmar'
      }
    }

    if (bulkAction.type === 'delete') {
      return {
        title: `Deletar ${selectedCount} tarefa(s)?`,
        description:
          'Essa ação remove as tarefas selecionadas localmente e também no Notion quando a sincronização automática estiver ativa.',
        actionLabel: 'Deletar'
      }
    }

    if (bulkAction.type === 'status') {
      return {
        title: `Marcar ${selectedCount} tarefa(s)?`,
        description: `As tarefas selecionadas terão o status alterado para ${STATUS_LABELS[bulkAction.status]}.`,
        actionLabel: 'Marcar'
      }
    }

    return {
      title: `Mover ${selectedCount} tarefa(s)?`,
      description:
        bulkAction.projectId === null
          ? 'As tarefas selecionadas serão desvinculadas de qualquer projeto.'
          : 'As tarefas selecionadas serão movidas para o projeto escolhido.',
      actionLabel: 'Mover'
    }
  }, [bulkAction, selectedCount])

  const bulkStatusOptions = useMemo(
    () => [
      { value: 'none', label: 'Marcar como...' },
      { value: 'inbox', label: STATUS_LABELS.inbox },
      { value: 'aguardando', label: STATUS_LABELS.aguardando },
      { value: 'proximas', label: STATUS_LABELS.proximas },
      { value: 'executando', label: STATUS_LABELS.executando },
      { value: 'finalizada', label: STATUS_LABELS.finalizada },
      { value: 'someday', label: STATUS_LABELS.someday }
    ],
    []
  )

  const bulkProjectOptions = useMemo(
    () => [
      { value: 'none', label: 'Mover para projeto...' },
      { value: 'no-project', label: 'Sem projeto' },
      ...availableProjects.map((project) => ({ value: String(project.id), label: project.name }))
    ],
    [availableProjects]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header: Tabs + View Toggle */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`
                    flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                    ${
                      statusFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }
                  `}
                >
                  <Icon size={14} className="mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  showFilters || hasActiveFilters
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }
              `}
            >
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-white text-slate-900 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {(categoryFilter !== 'all' ? 1 : 0) +
                    (searchQuery.trim() ? 1 : 0) +
                    (tagFilter !== null ? 1 : 0) +
                    (contextFilter !== null ? 1 : 0) +
                    (projectFilter !== null ? 1 : 0) +
                    (blockedFilter ? 1 : 0) +
                    (sortMode !== 'updated' ? 1 : 0)}
                </span>
              )}
            </button>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`
                  p-2 rounded-md transition-all
                  ${
                    viewMode === 'cards'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }
                `}
                title="Visualização em Cards"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`
                  p-2 rounded-md transition-all
                  ${
                    viewMode === 'table'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }
                `}
                title="Visualização em Tabela"
              >
                <List size={18} />
              </button>
            </div>

            {/* Agrupar / Kanban */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => {
                  const next = !groupingEnabled
                  setGroupingEnabled(next)
                  if (next) setKanbanEnabled(false)
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all
                  ${
                    groupingEnabled
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
                title="Agrupar tarefas"
              >
                <Layers size={16} /> Agrupar
              </button>
              {statusFilter === 'executando' && (
                <button
                  onClick={() => {
                    const next = !kanbanEnabled
                    setKanbanEnabled(next)
                    if (next) setGroupingEnabled(false)
                  }}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all
                    ${
                      kanbanEnabled
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }
                  `}
                  title="Modo Kanban"
                >
                  <Columns3 size={16} /> Kanban
                </button>
              )}
              {(groupingEnabled || (statusFilter === 'executando' && kanbanEnabled)) && (
                <div className="flex items-center gap-1 pl-1 ml-1 border-l border-slate-200">
                  <button
                    onClick={() => setGroupBy('project')}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                      groupBy === 'project'
                        ? 'bg-slate-200 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Projeto
                  </button>
                  <button
                    onClick={() => setGroupBy('context')}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                      groupBy === 'context'
                        ? 'bg-slate-200 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Contexto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Area - Collapsible */}
      {showFilters && (
        <div className="px-6 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    type="text"
                    placeholder="Buscar por nome ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter */}
              <div className="min-w-[160px]">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Categoria
                </label>
                <SearchableSelect
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(value as FilterCategory)}
                  options={categoryOptions}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar categoria..."
                />
              </div>

              {/* Context Filter */}
              {availableContexts.length > 0 && (
                <div className="min-w-[160px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Contexto
                  </label>
                  <SearchableSelect
                    value={contextFilter !== null ? String(contextFilter) : 'all'}
                    onChange={(value) => setContextFilter(value === 'all' ? null : Number(value))}
                    options={contextOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar contexto..."
                  />
                </div>
              )}

              {/* Project Filter */}
              {availableProjects.length > 0 && (
                <div className="min-w-[160px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Projeto
                  </label>
                  <SearchableSelect
                    value={
                      projectFilter !== null
                        ? projectFilter === -1
                          ? 'none'
                          : String(projectFilter)
                        : 'all'
                    }
                    onChange={(value) => {
                      if (value === 'all') setProjectFilter(null)
                      else if (value === 'none') setProjectFilter(-1)
                      else setProjectFilter(Number(value))
                    }}
                    options={projectOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar projeto..."
                  />
                </div>
              )}

              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div className="min-w-[160px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Fonte / Tag
                  </label>
                  <SearchableSelect
                    value={tagFilter !== null ? String(tagFilter) : 'all'}
                    onChange={(value) => setTagFilter(value === 'all' ? null : Number(value))}
                    options={tagOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar tag..."
                  />
                </div>
              )}

              {/* Blocked Filter */}
              <div className="min-w-fit">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Situação
                </label>
                <button
                  onClick={() => setBlockedFilter(!blockedFilter)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    blockedFilter
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Lock size={14} />
                  Bloqueadas
                </button>
              </div>

              {/* Sort Mode */}
              <div className="min-w-fit">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Ordenar por
                </label>
                <button
                  onClick={() => setSortMode(sortMode === 'updated' ? 'due_date' : 'updated')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    sortMode === 'due_date'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CalendarDays size={14} />
                  {sortMode === 'due_date' ? 'Prazo ↑' : 'Prazo'}
                </button>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Limpar filtros
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Mostrando {tasks.length} de {totalTasks} tarefas
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-6 pt-2 pb-24">
          {!loading && tasks.length > 0 && (
            <div className="mb-4 bg-white border border-slate-200 rounded-sm p-4">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">
                    {selectedCount} selecionada(s)
                  </span>
                  <button
                    onClick={() => toggleSelectAllVisible(true)}
                    disabled={tasks.length === selectedCount}
                    className="text-slate-600 hover:text-slate-900 disabled:text-slate-300"
                  >
                    Selecionar todas visíveis ({tasks.length})
                  </button>
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    disabled={selectedCount === 0}
                    className="text-slate-600 hover:text-slate-900 disabled:text-slate-300"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[180px]">
                    <SearchableSelect
                      value={bulkStatusValue}
                      onChange={(value) => setBulkStatusValue(value as TaskStatus | 'none')}
                      options={bulkStatusOptions}
                      placeholder="Marcar como..."
                      searchPlaceholder="Buscar status..."
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bulkStatusValue === 'none') {
                        toast.error('Selecione um status para marcar')
                        return
                      }
                      openConfirm({ type: 'status', status: bulkStatusValue })
                    }}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CheckCheck size={15} />
                    Marcar
                  </button>

                  <div className="min-w-[200px]">
                    <SearchableSelect
                      value={bulkProjectValue}
                      onChange={setBulkProjectValue}
                      options={bulkProjectOptions}
                      placeholder="Mover para projeto..."
                      searchPlaceholder="Buscar projeto..."
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bulkProjectValue === 'none') {
                        toast.error('Selecione um projeto para mover')
                        return
                      }
                      openConfirm({
                        type: 'project',
                        projectId:
                          bulkProjectValue === 'no-project' ? null : Number(bulkProjectValue)
                      })
                    }}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FolderInput size={15} />
                    Mover
                  </button>

                  <button
                    onClick={() => openConfirm({ type: 'delete' })}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <ListTodo size={32} />
              </div>
              <p>
                {statusFilter === 'all'
                  ? 'Nenhuma tarefa ainda. Crie uma nova!'
                  : `Nenhuma tarefa com status "${statusFilter}"`}
              </p>
            </div>
          ) : statusFilter === 'executando' && kanbanEnabled ? (
            <TaskKanban
              columns={taskGroups}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onScheduleForToday={handleScheduleForToday}
            />
          ) : groupingEnabled ? (
            <TaskGroups
              groups={taskGroups}
              viewMode={viewMode}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onToggleSelectAll={toggleSelectAllVisible}
              onScheduleForToday={handleScheduleForToday}
            />
          ) : viewMode === 'cards' ? (
            <TaskList
              tasks={tasks}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onScheduleForToday={handleScheduleForToday}
            />
          ) : (
            <TaskTable
              tasks={tasks}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onToggleSelectAll={toggleSelectAllVisible}
              onScheduleForToday={handleScheduleForToday}
            />
          )}
        </div>
      </ScrollArea>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open && !bulkLoading) {
            setBulkAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleBulkActionConfirm()
              }}
              disabled={bulkLoading}
              className={
                bulkAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''
              }
            >
              {bulkLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Aplicando...
                </span>
              ) : (
                confirmDialogContent.actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
