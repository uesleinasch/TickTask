import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Input } from '@renderer/components/ui/input'
import { TaskList } from '@renderer/components/TaskList'
import { TaskTable } from '@renderer/components/TaskTable'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks, useFilteredTasks } from '@renderer/hooks/useTasks'
import { eventEmitter } from '@renderer/App'
import type { TaskStatus, TaskCategory, CreateTaskInput } from '../../../shared/types'
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
  X
} from 'lucide-react'

type FilterStatus = TaskStatus | 'all'
type FilterCategory = TaskCategory | 'all'
type ViewMode = 'cards' | 'table'

interface TabItem {
  id: FilterStatus
  label: string
  icon: React.ElementType
}

interface CategoryOption {
  id: FilterCategory
  label: string
  color: string
}

const tabs: TabItem[] = [
  { id: 'all', label: 'Todas', icon: ListTodo },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'aguardando', label: 'Aguardando', icon: Hourglass },
  { id: 'proximas', label: 'Próximas', icon: Calendar },
  { id: 'executando', label: 'Executando', icon: Activity },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckSquare }
]

const categories: CategoryOption[] = [
  { id: 'all', label: 'Todas', color: 'bg-slate-500' },
  { id: 'urgente', label: 'Urgente', color: 'bg-red-500' },
  { id: 'prioridade', label: 'Prioridade', color: 'bg-orange-500' },
  { id: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { id: 'time_leak', label: 'Time Leak', color: 'bg-yellow-500' }
]

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, createTask } = useTasks(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showFilters, setShowFilters] = useState(false)

  // Filtrar por status usando o hook existente
  const statusFilteredTasks = useFilteredTasks(tasks, statusFilter)
  
  // Aplicar filtros adicionais (categoria e busca)
  const filteredTasks = useMemo(() => {
    let result = statusFilteredTasks

    // Filtrar por categoria
    if (categoryFilter !== 'all') {
      result = result.filter((task) => task.category === categoryFilter)
    }

    // Filtrar por nome/descrição
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (task) =>
          task.name.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      )
    }

    return result
  }, [statusFilteredTasks, categoryFilter, searchQuery])

  // Verificar se há filtros ativos
  const hasActiveFilters = categoryFilter !== 'all' || searchQuery.trim() !== ''

  // Limpar todos os filtros
  const clearFilters = (): void => {
    setCategoryFilter('all')
    setSearchQuery('')
  }

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

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header: Tabs + View Toggle */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs - Pills Style */}
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

          {/* Actions: Filter Toggle + View Toggle */}
          <div className="flex items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${showFilters || hasActiveFilters
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }
              `}
            >
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-white text-slate-900 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {(categoryFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0)}
                </span>
              )}
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('cards')}
                className={`
                  p-2 rounded-md transition-all
                  ${viewMode === 'cards' 
                    ? 'bg-slate-900 text-white shadow-sm' 
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
                  ${viewMode === 'table' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }
                `}
                title="Visualização em Tabela"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Area - Collapsible */}
      {showFilters && (
        <div className="px-6 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search Input */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <div className="min-w-[180px]">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${categoryFilter === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }
                      `}
                    >
                      {cat.id !== 'all' && (
                        <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                      )}
                      {cat.label}
                    </button>
                  ))}
                </div>
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

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <span>Mostrando {filteredTasks.length} de {tasks.length} tarefas</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content: Cards ou Table */}
      <ScrollArea className="flex-1">
        <div className="p-6 pt-2 pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
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
          ) : viewMode === 'cards' ? (
            <TaskList tasks={filteredTasks} onTaskClick={handleTaskClick} />
          ) : (
            <TaskTable tasks={filteredTasks} onTaskClick={handleTaskClick} />
          )}
        </div>
      </ScrollArea>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}
