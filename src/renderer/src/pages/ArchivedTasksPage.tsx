import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useTasks } from '@renderer/hooks/useTasks'
import { formatTime } from '@renderer/lib/utils'
import { ArrowLeft, Undo2, Trash2 } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

export function ArchivedTasksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks, loading, refreshTasks } = useTasks({ archived: true })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const visibleSelectedIds = useMemo(
    () => tasks.filter((task) => selectedIds.has(task.id)).map((task) => task.id),
    [tasks, selectedIds]
  )
  const allSelected = tasks.length > 0 && visibleSelectedIds.length === tasks.length

  const toggleSelected = (taskId: number, selected: boolean): void => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  const toggleSelectAll = (selected: boolean): void => {
    setSelectedIds(selected ? new Set(tasks.map((task) => task.id)) : new Set())
  }

  const handleUnarchive = async (taskId: number): Promise<void> => {
    await window.api.unarchiveTask(taskId)
    toggleSelected(taskId, false)
    await refreshTasks()
    toast.success('Tarefa desarquivada')
  }

  const handleBulkUnarchive = async (): Promise<void> => {
    if (visibleSelectedIds.length === 0) return
    setBulkLoading(true)
    try {
      await window.api.bulkSetArchived(visibleSelectedIds, false)
      toast.success(`${visibleSelectedIds.length} tarefa(s) desarquivada(s)`)
      setSelectedIds(new Set())
      await refreshTasks()
    } catch (error) {
      console.error('Erro ao desarquivar tarefas:', error)
      toast.error('Não foi possível desarquivar as tarefas')
    } finally {
      setBulkLoading(false)
    }
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
        >
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
        <h1 className="text-lg font-bold text-slate-900">Arquivo Morto</h1>
        {tasks.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Selecionar todas
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBulkUnarchive()}
              disabled={visibleSelectedIds.length === 0 || bulkLoading}
              className="border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Undo2 size={16} className="mr-2" /> Desarquivar ({visibleSelectedIds.length})
            </Button>
          </div>
        )}
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 p-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Carregando...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-slate-400 mt-20">Nenhuma tarefa arquivada.</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-slate-200 rounded-sm p-4 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={(e) => toggleSelected(task.id, e.target.checked)}
                    aria-label={`Selecionar ${task.name}`}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={task.status} />
                      <span className="text-xs text-slate-400">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-900">{task.name}</h3>
                    <div className="text-sm text-slate-500 font-mono mt-1">
                      Tempo Final: {formatTime(task.total_seconds)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnarchive(task.id)}
                    className="border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Undo2 size={16} className="mr-2" /> Desarquivar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(task.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
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
