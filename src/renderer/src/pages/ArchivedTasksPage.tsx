import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useTasks } from '@renderer/hooks/useTasks'
import { formatTime } from '@renderer/lib/utils'
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

export function ArchivedTasksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, refreshTasks } = useTasks(true) // archived = true
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)

  const handleUnarchive = async (taskId: number): Promise<void> => {
    await window.api.unarchiveTask(taskId)
    await refreshTasks()
    toast.success('Tarefa desarquivada')
  }

  const handleDeleteClick = (taskId: number): void => {
    setTaskToDelete(taskId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (taskToDelete) {
      await window.api.deleteTask(taskToDelete)
      await refreshTasks()
      toast.success('Tarefa deletada')
    }
    setTaskToDelete(null)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Tarefas Arquivadas</h1>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhuma tarefa arquivada</p>
            <p className="text-sm">Tarefas arquivadas aparecerão aqui</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <Card key={task.id} className="py-4">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{task.name}</h3>
                    <p className="text-muted-foreground text-sm font-mono">
                      {formatTime(task.total_seconds)}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnarchive(task.id)}
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Desarquivar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
