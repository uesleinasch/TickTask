import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { TaskList } from '@renderer/components/TaskList'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks, useFilteredTasks } from '@renderer/hooks/useTasks'
import type { TaskStatus, CreateTaskInput } from '../../../shared/types'
import { Plus, Archive } from 'lucide-react'

type FilterStatus = TaskStatus | 'all'

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, createTask } = useTasks(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const filteredTasks = useFilteredTasks(tasks, statusFilter)

  const handleCreateTask = async (data: CreateTaskInput): Promise<void> => {
    const task = await createTask(data)
    navigate(`/task/${task.id}`)
  }

  const handleTaskClick = (taskId: number): void => {
    navigate(`/task/${taskId}`)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">TickTask</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/archived')}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivadas
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </header>

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
          <TabsContent value={statusFilter} className="p-4 m-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              <TaskList tasks={filteredTasks} onTaskClick={handleTaskClick} />
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}
