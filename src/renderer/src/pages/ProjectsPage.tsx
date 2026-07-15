import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { useProjects } from '@renderer/hooks/useProjects'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { DEFAULT_COLORS } from '@renderer/lib/colors'
import type { ProjectStatus, CreateProjectInput } from '@shared/types'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@shared/types'
import {
  FolderKanban,
  Plus,
  ArrowLeft,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

type FilterStatus = ProjectStatus | 'all'

const statusTabs: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'someday', label: 'Someday' },
  { id: 'done', label: 'Concluídos' },
  { id: 'archived', label: 'Arquivados' }
]

export function ProjectsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { projects, loading, createProject } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[9]) // #6366f1

  const filteredProjects =
    statusFilter === 'all'
      ? projects
      : projects.filter((p) => p.status === statusFilter)

  const handleCreateProject = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault()
      if (!name.trim()) return

      const data: CreateProjectInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        outcome: outcome.trim() || undefined,
        color
      }

      const project = await createProject(data)
      setName('')
      setDescription('')
      setOutcome('')
      setColor(DEFAULT_COLORS[9])
      setDialogOpen(false)
      navigate(`/project/${project.id}`)
    },
    [name, description, outcome, color, createProject, navigate]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            <ArrowLeft size={18} className="mr-2" /> Voltar
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <FolderKanban size={20} className="text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Projetos</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </header>

      {/* Status Tabs */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="ml-2 text-xs opacity-70">
                  {projects.filter((p) => p.status === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-6 pt-2 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <FolderKanban size={32} />
              </div>
              <p>Nenhum projeto encontrado.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro projeto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const progress =
                  project.task_count && project.task_count > 0
                    ? Math.round(
                        ((project.completed_task_count || 0) / project.task_count) * 100
                      )
                    : 0

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group cursor-pointer bg-white border border-slate-200 rounded-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
                    style={{ borderLeftColor: project.color, borderLeftWidth: '4px' }}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white',
                          PROJECT_STATUS_COLORS[project.status]
                        )}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                      {project.due_date && (
                        <span className="text-xs text-slate-400 flex items-center">
                          <Clock size={12} className="mr-1" />
                          {new Date(project.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-1 line-clamp-1">
                      {project.name}
                    </h3>

                    {/* Description */}
                    {project.description && (
                      <p className="text-slate-500 text-sm line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}

                    {/* Outcome */}
                    {project.outcome && (
                      <div className="flex items-start gap-2 mb-3 bg-emerald-50 rounded-lg px-3 py-2">
                        <Target size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-emerald-700 line-clamp-2">{project.outcome}</p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>
                          {project.completed_task_count || 0} / {project.task_count || 0} tarefas
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Action */}
                    {project.next_action && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                        <ArrowRight size={12} className="shrink-0" />
                        <span className="line-clamp-1">
                          Próxima: {project.next_action}
                        </span>
                      </div>
                    )}

                    {!project.next_action && project.status === 'active' && (project.task_count || 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span>Sem próxima ação definida</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white rounded-sm shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Novo Projeto</DialogTitle>
            <DialogDescription className="text-slate-500">
              Um projeto GTD requer mais de uma ação para ser concluído.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium text-slate-700">
                Nome *
              </label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Redesenhar módulo de autenticação"
                required
                className="border-slate-300 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="project-desc" className="text-sm font-medium text-slate-700">
                Descrição
              </label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre o projeto..."
                rows={2}
                className="border-slate-300 focus:ring-slate-900 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="project-outcome" className="text-sm font-medium text-slate-700">
                Resultado Desejado (Outcome)
              </label>
              <Textarea
                id="project-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Como será quando este projeto estiver concluído?"
                rows={2}
                className="border-slate-300 focus:ring-slate-900 resize-none"
              />
            </div>
            <ColorPicker value={color} onChange={setColor} />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!name.trim()}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Criar Projeto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
