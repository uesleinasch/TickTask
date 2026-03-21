import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { Timer } from '@renderer/components/Timer'
import { StatusSelect } from '@renderer/components/StatusSelect'
import { CategorySelect } from '@renderer/components/CategorySelect'
import { TimeEntryList } from '@renderer/components/TimeEntryList'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { TagInput } from '@renderer/components/TagInput'
import { SubtaskList } from '@renderer/components/SubtaskList'
import { DependencySelector } from '@renderer/components/DependencySelector'
import { RecurrenceSelect } from '@renderer/components/RecurrenceSelect'
import { useTaskDetail } from '@renderer/hooks/useTaskDetail'
import { formatTime, parseTimeInput } from '@renderer/lib/utils'
import type { TaskStatus, TaskCategory, Tag, Project, Context } from '../../../shared/types'
import { ArrowLeft, Archive, Trash2, AlertCircle, Plus, Edit3, Tags, FolderKanban, MapPin, ListChecks, Lock, RefreshCw, CalendarDays, Calendar } from 'lucide-react'
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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContextIds, setSelectedContextIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)

  // Dados disponíveis
  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
    window.api.listContexts().then(setContexts).catch(console.error)
  }, [])

  // Sincronizar estado local com task
  useEffect(() => {
    if (task) {
      setName(task.name)
      setDescription(task.description || '')
      setTimeLimit(task.time_limit_seconds ? formatTime(task.time_limit_seconds) : '')
      setAdjustTime(formatTime(task.total_seconds))
      setSelectedTags(task.tags || [])
      setSelectedProjectId(task.project_id || null)
      setSelectedContextIds(task.contexts?.map((c) => c.id) || [])
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setScheduledDate(task.scheduled_date || '')
      setRecurrenceRule(task.recurrence_rule || null)
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

  const handleCategoryChange = useCallback(
    async (category: TaskCategory): Promise<void> => {
      await updateTask({ category })
      toast.success(`Categoria alterada para ${category}`)
    },
    [updateTask]
  )

  const handleTagsChange = useCallback(
    async (tags: Tag[]): Promise<void> => {
      setSelectedTags(tags)
      await updateTask({ tagIds: tags.map((t) => t.id) })
      toast.success('Tags atualizadas')
    },
    [updateTask]
  )

  const handleProjectChange = useCallback(
    async (value: string): Promise<void> => {
      const newProjectId = value === 'none' ? null : Number(value)
      setSelectedProjectId(newProjectId)
      await updateTask({ project_id: newProjectId })
      toast.success(newProjectId ? 'Projeto vinculado' : 'Projeto removido')
    },
    [updateTask]
  )

  const toggleContext = useCallback(
    async (contextId: number): Promise<void> => {
      const newIds = selectedContextIds.includes(contextId)
        ? selectedContextIds.filter((id) => id !== contextId)
        : [...selectedContextIds, contextId]
      setSelectedContextIds(newIds)
      await updateTask({ contextIds: newIds })
    },
    [selectedContextIds, updateTask]
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

  const handleDueDateChange = useCallback(
    async (value: string): Promise<void> => {
      setDueDate(value)
      await updateTask({ due_date: value || null })
    },
    [updateTask]
  )

  const handleScheduledDateChange = useCallback(
    async (value: string): Promise<void> => {
      setScheduledDate(value)
      await updateTask({ scheduled_date: value || null })
    },
    [updateTask]
  )

  const handleRecurrenceChange = useCallback(
    async (value: string | null): Promise<void> => {
      setRecurrenceRule(value)
      await updateTask({ recurrence_rule: value })
      toast.success(value ? 'Recorrência configurada' : 'Recorrência removida')
    },
    [updateTask]
  )

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

  const projectOptions = [
    { value: 'none', label: 'Nenhum' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name }))
  ]

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
        <div className="flex items-center gap-3">
          <CategorySelect value={task.category || 'normal'} onChange={handleCategoryChange} />
          <StatusSelect value={task.status} onChange={handleStatusChange} />
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Título e Descrição */}
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

          {/* Projeto e Contextos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Projeto */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <FolderKanban size={16} className="mr-2" /> Projeto
              </h4>
              <SearchableSelect
                value={selectedProjectId ? String(selectedProjectId) : 'none'}
                onChange={handleProjectChange}
                options={projectOptions}
                placeholder="Selecione um projeto..."
                searchPlaceholder="Buscar projeto..."
              />
              {task.project_name && (
                <button
                  onClick={() => navigate(`/project/${task.project_id}`)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Ir para o projeto: {task.project_name}
                </button>
              )}
            </div>

            {/* Contextos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <MapPin size={16} className="mr-2" /> Contextos
              </h4>
              <div className="flex flex-wrap gap-2">
                {contexts.map((ctx) => {
                  const isSelected = selectedContextIds.includes(ctx.id)
                  return (
                    <button
                      key={ctx.id}
                      onClick={() => toggleContext(ctx.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                        ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }
                      `}
                      style={isSelected ? { backgroundColor: ctx.color, borderColor: ctx.color } : {}}
                    >
                      <span>{ctx.icon}</span>
                      {ctx.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <Tags size={16} className="mr-2" /> Fonte / Tags
            </h4>
            <TagInput
              selectedTags={selectedTags}
              onChange={handleTagsChange}
              placeholder="Adicionar tags..."
            />
          </div>

          {/* Bloqueio por dependências */}
          {task.is_blocked && (
            <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
              <Lock size={16} />
              <span>Esta tarefa está bloqueada por dependências não concluídas.</span>
            </div>
          )}

          {/* Datas e Recorrência */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <CalendarDays size={16} className="mr-2" /> Programado para
              </h4>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => handleScheduledDateChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Calendar size={16} className="mr-2" /> Prazo
              </h4>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <RefreshCw size={16} className="mr-2" /> Recorrência
              </h4>
              <RecurrenceSelect value={recurrenceRule} onChange={handleRecurrenceChange} />
            </div>
          </div>

          {/* Subtarefas */}
          {!task.parent_task_id && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <ListChecks size={16} className="mr-2" /> Subtarefas
              </h4>
              <SubtaskList parentTaskId={task.id} isParentBlocked={task.is_blocked} onSubtaskChange={refreshTask} />
            </div>
          )}

          {/* Dependências */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
              <Lock size={16} className="mr-2" /> Depende de
            </h4>
            <DependencySelector taskId={task.id} onDependenciesChange={refreshTask} />
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

          {/* Configurações de Tempo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
