import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Timer } from '@renderer/components/Timer'
import { StatusSelect } from '@renderer/components/StatusSelect'
import { TimeEntryList } from '@renderer/components/TimeEntryList'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useTaskDetail } from '@renderer/hooks/useTaskDetail'
import { formatTime, parseTimeInput } from '@renderer/lib/utils'
import type { TaskStatus } from '../../../shared/types'
import { ArrowLeft, Archive, Trash2, Save } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

export function SingleTaskPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id || '0', 10)

  const { task, timeEntries, loading, refreshTask, updateTask, updateStatus, archiveTask, deleteTask } =
    useTaskDetail(taskId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Sincronizar estado local com task
  useEffect(() => {
    if (task) {
      setName(task.name)
      setDescription(task.description || '')
      setTimeLimit(task.time_limit_seconds ? formatTime(task.time_limit_seconds) : '')
    }
  }, [task])

  // Detectar mudanças
  useEffect(() => {
    if (task) {
      const nameChanged = name !== task.name
      const descChanged = description !== (task.description || '')
      const timeLimitChanged =
        timeLimit !== (task.time_limit_seconds ? formatTime(task.time_limit_seconds) : '')
      setHasChanges(nameChanged || descChanged || timeLimitChanged)
    }
  }, [name, description, timeLimit, task])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!task) return

    const timeLimitSeconds = timeLimit.trim() ? parseTimeInput(timeLimit) : undefined

    await updateTask({
      name: name.trim(),
      description: description.trim() || undefined,
      time_limit_seconds: timeLimitSeconds
    })

    setHasChanges(false)
    toast.success('Tarefa salva com sucesso!')
  }, [task, name, description, timeLimit, updateTask])

  const handleStatusChange = useCallback(
    async (status: TaskStatus): Promise<void> => {
      await updateStatus(status)
      toast.success(`Status alterado para ${status}`)
    },
    [updateStatus]
  )

  const handleArchive = useCallback(async (): Promise<void> => {
    await archiveTask()
    toast.success('Tarefa arquivada')
    navigate('/')
  }, [archiveTask, navigate])

  const handleDelete = useCallback(async (): Promise<void> => {
    await deleteTask()
    toast.success('Tarefa deletada')
    navigate('/')
  }, [deleteTask, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Tarefa não encontrada</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-screen">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">Detalhes da Tarefa</h1>
        </div>

        {/* Nome e Descrição */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da tarefa"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Status:</span>
          <StatusSelect value={task.status} onChange={handleStatusChange} />
        </div>

        {/* Timer */}
        <Timer
          taskId={task.id}
          initialSeconds={task.total_seconds}
          timeLimit={task.time_limit_seconds}
          isRunning={task.is_running}
          taskName={task.name}
          onStateChange={refreshTask}
        />

        {/* Tempo Limite */}
        <div className="space-y-2">
          <label htmlFor="timeLimit" className="text-sm font-medium">
            Tempo Limite
          </label>
          <Input
            id="timeLimit"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            placeholder="HH:MM:SS"
          />
          <p className="text-xs text-muted-foreground">
            Formato: HH:MM:SS (ex: 02:00:00 para 2 horas)
          </p>
        </div>

        {/* Botão Salvar */}
        {hasChanges && (
          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        )}

        {/* Histórico de Sessões */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Histórico de Sessões</h2>
          <TimeEntryList entries={timeEntries} />
        </div>

        {/* Ações */}
        <div className="flex gap-4 pt-4 border-t">
          <Button variant="outline" onClick={handleArchive} className="flex-1">
            <Archive className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </ScrollArea>
  )
}
