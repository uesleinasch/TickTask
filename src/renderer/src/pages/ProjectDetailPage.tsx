import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { CategoryBadge } from '@renderer/components/CategoryBadge'
import { useProjectDetail } from '@renderer/hooks/useProjects'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { DEFAULT_COLORS } from '@renderer/lib/colors'
import { formatTime } from '@renderer/lib/utils'
import type { ProjectStatus } from '@shared/types'
import { PROJECT_STATUS_LABELS } from '@shared/types'
import {
  ArrowLeft,
  Trash2,
  Target,
  FolderKanban,
  Clock,
  Activity
} from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'
import { cn } from '@renderer/lib/utils'

const projectStatuses: ProjectStatus[] = ['active', 'someday', 'done', 'archived']

export function ProjectDetailPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const projectId = parseInt(id || '0', 10)

  const { project, tasks, loading, updateProject, deleteProject } =
    useProjectDetail(projectId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[9])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setOutcome(project.outcome || '')
      setDueDate(project.due_date ? project.due_date.split('T')[0] : '')
      setColor(project.color || DEFAULT_COLORS[9])
    }
  }, [project])

  const handleBlurSave = useCallback(async (): Promise<void> => {
    if (!project) return
    await updateProject({
      name: name.trim(),
      description: description.trim() || undefined,
      outcome: outcome.trim() || undefined,
      due_date: dueDate || undefined
    })
  }, [project, name, description, outcome, dueDate, updateProject])

  const handleStatusChange = useCallback(
    async (status: ProjectStatus): Promise<void> => {
      await updateProject({ status })
      toast.success(`Status alterado para ${PROJECT_STATUS_LABELS[status]}`)
    },
    [updateProject]
  )

  const handleColorChange = useCallback(
    async (newColor: string): Promise<void> => {
      setColor(newColor)
      await updateProject({ color: newColor })
    },
    [updateProject]
  )

  const handleDelete = useCallback(async (): Promise<void> => {
    await deleteProject()
    toast.success('Projeto deletado')
    navigate('/projects')
  }, [deleteProject, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50">
        <p className="text-slate-400">Projeto não encontrado</p>
        <Button onClick={() => navigate('/projects')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  const progress =
    project.task_count && project.task_count > 0
      ? Math.round(((project.completed_task_count || 0) / project.task_count) * 100)
      : 0

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            <ArrowLeft size={18} className="mr-2" /> Projetos
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={project.status}
            onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
          >
            <SelectTrigger className="w-[160px] bg-slate-100 border-none text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {projectStatuses.map((status) => (
                <SelectItem key={status} value={status} className="text-slate-700">
                  {PROJECT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="bg-red-500 hover:bg-red-600"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Title & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="h-5 w-5 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: color }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlurSave}
                className="w-full text-3xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none transition-colors text-slate-900 placeholder:text-slate-300"
                placeholder="Nome do Projeto"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleBlurSave}
              className="w-full bg-transparent resize-none text-slate-600 focus:outline-none hover:bg-white/50 rounded-md p-2 -ml-2 transition-colors min-h-[60px]"
              placeholder="Adicione uma descrição..."
            />
            <ColorPicker value={color} onChange={handleColorChange} />
          </div>

          {/* Outcome & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-sm p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Target size={16} className="mr-2 text-emerald-600" /> Resultado Desejado
              </h4>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                onBlur={handleBlurSave}
                className="w-full bg-slate-50 rounded-lg p-3 text-sm text-slate-700 resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="Como será quando estiver concluído?"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-sm p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Clock size={16} className="mr-2 text-blue-600" /> Data Limite
              </h4>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleBlurSave}
                className="bg-slate-50 border-slate-200"
              />
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center">
                  <FolderKanban size={16} className="mr-2" /> Progresso
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>
                    {project.completed_task_count || 0} / {project.task_count || 0} tarefas
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="pt-4 pb-20">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Tarefas do Projeto ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhuma tarefa vinculada a este projeto.</p>
                <p className="text-xs mt-1">
                  Vincule tarefas editando-as e selecionando este projeto.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 cursor-pointer hover:border-slate-300 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={task.status} />
                        <CategoryBadge category={task.category || 'normal'} />
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{task.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.is_running && (
                        <Activity size={14} className="text-emerald-500 animate-pulse" />
                      )}
                      <span
                        className={cn(
                          'text-sm font-mono tabular-nums',
                          task.is_running ? 'text-emerald-600' : 'text-slate-500'
                        )}
                      >
                        {formatTime(task.total_seconds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
