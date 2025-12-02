import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Timer } from '@renderer/components/Timer'
import { StatusSelect } from '@renderer/components/StatusSelect'
import { TimeEntryList } from '@renderer/components/TimeEntryList'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useTaskDetail } from '@renderer/hooks/useTaskDetail'
import { formatTime, parseTimeInput } from '@renderer/lib/utils'
import type { TaskStatus } from '../../../shared/types'
import { ArrowLeft, Archive, Trash2, AlertCircle, Plus, Edit3 } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

export function SingleTaskPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id || '0', 10)

  const {
    task,
    timeEntries,
    loading,
    refreshTask,
    updateTask,
    updateStatus,
    archiveTask,
    deleteTask
  } = useTaskDetail(taskId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [adjustTime, setAdjustTime] = useState('')

  // Sincronizar estado local com task
  useEffect(() => {
    if (task) {
      setName(task.name)
      setDescription(task.description || '')
      setTimeLimit(task.time_limit_seconds ? formatTime(task.time_limit_seconds) : '')
      setAdjustTime(formatTime(task.total_seconds))
    }
  }, [task])

  const handleBlurSave = useCallback(async (): Promise<void> => {
    if (!task) return

    const timeLimitSeconds = timeLimit.trim() ? parseTimeInput(timeLimit) : undefined

    await updateTask({
      name: name.trim(),
      description: description.trim() || undefined,
      time_limit_seconds: timeLimitSeconds
    })
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

  const handleAddManualTime = useCallback(async (): Promise<void> => {
    if (!manualTime.trim()) return

    const seconds = parseTimeInput(manualTime)
    if (seconds <= 0) {
      toast.error('Tempo inválido')
      return
    }

    try {
      await window.api.addManualTime(taskId, seconds)
      await refreshTask()
      setManualTime('')
      toast.success(`Adicionado ${formatTime(seconds)} à tarefa`)
    } catch (error) {
      console.error('Erro ao adicionar tempo manual:', error)
      toast.error('Erro ao adicionar tempo')
    }
  }, [taskId, manualTime, refreshTask])

  const handleSetTotalTime = useCallback(async (): Promise<void> => {
    if (!adjustTime.trim()) return

    const seconds = parseTimeInput(adjustTime)
    if (seconds < 0) {
      toast.error('Tempo inválido')
      return
    }

    try {
      await window.api.setTotalTime(taskId, seconds)
      await refreshTask()
      toast.success(`Tempo total ajustado para ${formatTime(seconds)}`)
    } catch (error) {
      console.error('Erro ao ajustar tempo:', error)
      toast.error('Erro ao ajustar tempo')
    }
  }, [taskId, adjustTime, refreshTask])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
        <p className="text-slate-400">Tarefa não encontrada</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
        >
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium mr-2">Status:</span>
          <StatusSelect value={task.status} onChange={handleStatusChange} />
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Título e Descrição Editáveis */}
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleBlurSave}
              className="w-full text-3xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none transition-colors text-slate-900 placeholder:text-slate-300"
              placeholder="Nome da Tarefa"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleBlurSave}
              className="w-full bg-transparent resize-none text-slate-600 focus:outline-none hover:bg-white/50 rounded-md p-2 -ml-2 transition-colors min-h-[60px]"
              placeholder="Adicione uma descrição..."
            />
          </div>

          {/* Timer Central */}
          <Timer
            taskId={task.id}
            initialSeconds={task.total_seconds}
            timeLimit={task.time_limit_seconds}
            isRunning={task.is_running}
            taskName={task.name}
            onStateChange={refreshTask}
          />

          {/* Configurações de Tempo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Adicionar Tempo Manual */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Plus size={16} className="mr-2" /> Adicionar Tempo
              </h4>
              <p className="text-xs text-slate-500 mb-3">Adicione tempo já gasto manualmente</p>
              <div className="flex gap-2">
                <Input
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="flex-1 bg-slate-50 border-slate-200 font-mono text-sm"
                  placeholder="01:30:00"
                />
                <Button
                  size="sm"
                  onClick={handleAddManualTime}
                  disabled={!manualTime.trim()}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Ajustar Tempo Total */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Edit3 size={16} className="mr-2" /> Ajustar Tempo Total
              </h4>
              <p className="text-xs text-slate-500 mb-3">Defina o tempo total da tarefa</p>
              <div className="flex gap-2">
                <Input
                  value={adjustTime}
                  onChange={(e) => setAdjustTime(e.target.value)}
                  className="flex-1 bg-slate-50 border-slate-200 font-mono text-sm"
                  placeholder="00:00:00"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSetTotalTime}
                  className="bg-slate-100 text-slate-900 hover:bg-slate-200"
                >
                  Definir
                </Button>
              </div>
            </div>
          </div>

          {/* Limite de Tempo e Ações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Limit Input */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <AlertCircle size={16} className="mr-2" /> Limite de Tempo
              </h4>
              <div className="flex gap-2">
                <Input
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  onBlur={handleBlurSave}
                  className="flex-1 bg-slate-50 border-slate-200 font-mono text-sm"
                  placeholder="00:00:00"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBlurSave}
                  className="bg-slate-100 text-slate-900 hover:bg-slate-200"
                >
                  Salvar
                </Button>
              </div>
            </div>

            {/* Ações */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Ações</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-100"
                  onClick={handleArchive}
                >
                  <Archive size={16} className="mr-2" /> Arquivar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 size={16} className="mr-2" /> Deletar
                </Button>
              </div>
            </div>
          </div>

          {/* Histórico de Sessões */}
          <div className="pt-4 pb-20">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Histórico de Sessões
            </h3>
            <TimeEntryList entries={timeEntries} />
          </div>
        </div>
      </ScrollArea>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
