import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TaskList } from '@renderer/components/TaskList'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks, useFilteredTasks } from '@renderer/hooks/useTasks'
import { eventEmitter } from '@renderer/App'
import type { TaskStatus, CreateTaskInput } from '../../../shared/types'

type FilterStatus = TaskStatus | 'all'

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, createTask } = useTasks(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('inbox')

  const filteredTasks = useFilteredTasks(tasks, statusFilter)

  // Ouvir evento de nova tarefa do TitleBar
  useEffect(() => {
    const openDialog = (): void => setDialogOpen(true)
    eventEmitter.on('open-new-task-dialog', openDialog)
    return () => eventEmitter.off('open-new-task-dialog', openDialog)
  }, [])

  const handleCreateTask = useCallback(async (data: CreateTaskInput): Promise<void> => {
    const task = await createTask(data)
    navigate(`/task/${task.id}`)
  }, [createTask, navigate])

  const handleTaskClick = (taskId: number): void => {
    navigate(`/task/${taskId}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as FilterStatus)}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 pt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="aguardando">Aguardando</TabsTrigger>
            <TabsTrigger value="proximas">Próximas</TabsTrigger>
            <TabsTrigger value="executando">Executando</TabsTrigger>
            <TabsTrigger value="finalizada">Finalizadas</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
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
      </Tabs>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}