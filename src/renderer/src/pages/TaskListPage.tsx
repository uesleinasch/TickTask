import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TaskList } from '@renderer/components/TaskList'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks, useFilteredTasks } from '@renderer/hooks/useTasks'
import { eventEmitter } from '@renderer/App'
import type { TaskStatus, CreateTaskInput } from '../../../shared/types'
import {
  ListTodo,
  Inbox,
  Hourglass,
  Calendar,
  Activity,
  CheckSquare
} from 'lucide-react'

type FilterStatus = TaskStatus | 'all'

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
  { id: 'finalizada', label: 'Finalizadas', icon: CheckSquare }
]

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, createTask } = useTasks(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const filteredTasks = useFilteredTasks(tasks, statusFilter)

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
      {/* Tabs - Pills Style */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
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
      </div>

      {/* Grid de Cards */}
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
          ) : (
            <TaskList tasks={filteredTasks} onTaskClick={handleTaskClick} />
          )}
        </div>
      </ScrollArea>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}