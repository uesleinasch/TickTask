import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Progress } from '@renderer/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useAreas, useGoals } from '@renderer/hooks/useHorizons'
import { useProjects } from '@renderer/hooks/useProjects'
import { useTasks } from '@renderer/hooks/useTasks'
import type { Area, Goal, GoalHorizon, CreateAreaInput, CreateGoalInput } from '@shared/types'
import {
  ArrowLeft,
  Plus,
  Target,
  Mountain,
  Layers,
  CalendarDays,
  FolderKanban,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  Compass,
  Star,
  Telescope
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { toast } from '@renderer/components/ui/sonner'

// ===================== HORIZON CONFIG =====================

const HORIZON_CONFIG = {
  0: {
    label: 'H0 — Próximas Ações',
    sublabel: 'Tarefas agendadas para hoje',
    icon: CalendarDays,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  1: {
    label: 'H1 — Projetos',
    sublabel: 'Projetos em andamento',
    icon: FolderKanban,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50 border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  2: {
    label: 'H2 — Áreas de Foco',
    sublabel: 'Responsabilidades e papéis',
    icon: Layers,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50 border-violet-200',
    textColor: 'text-violet-700',
    badgeColor: 'bg-violet-100 text-violet-700'
  },
  3: {
    label: 'H3 — Metas (1–2 anos)',
    sublabel: 'Objetivos de curto prazo',
    icon: Target,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  4: {
    label: 'H4 — Visão (3–5 anos)',
    sublabel: 'Onde você quer estar',
    icon: Compass,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50 border-rose-200',
    textColor: 'text-rose-700',
    badgeColor: 'bg-rose-100 text-rose-700'
  },
  5: {
    label: 'H5 — Propósito',
    sublabel: 'Princípios e razão de ser',
    icon: Telescope,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50 border-indigo-200',
    textColor: 'text-indigo-700',
    badgeColor: 'bg-indigo-100 text-indigo-700'
  }
} as const

const HORIZON_ICONS: Record<number, string> = {
  3: '🎯',
  4: '🔭',
  5: '✨'
}

// ===================== AREA DIALOG =====================

interface AreaDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateAreaInput) => Promise<void>
  initial?: Partial<CreateAreaInput>
  title: string
}

const AREA_ICONS = ['🎯', '💼', '🏋️', '🧠', '🏠', '❤️', '🌱', '💰', '🎨', '📚', '🤝', '⚡']

function AreaDialog({ open, onClose, onSave, initial, title }: AreaDialogProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [icon, setIcon] = useState(initial?.icon || '🎯')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) return
      await onSave({ name: name.trim(), description: description.trim() || undefined, icon })
      onClose()
    },
    [name, description, icon, onSave, onClose]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os dados da área de foco.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {AREA_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-9 h-9 text-lg rounded-lg border-2 transition-colors',
                    icon === i ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carreira, Saúde, Família..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva esta área de foco..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===================== GOAL DIALOG =====================

interface GoalDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateGoalInput) => Promise<void>
  areas: Area[]
  initial?: Partial<CreateGoalInput>
  title: string
}

function GoalDialog({ open, onClose, onSave, areas, initial, title }: GoalDialogProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [horizon, setHorizon] = useState<GoalHorizon>(initial?.horizon || 3)
  const [areaId, setAreaId] = useState<string>(initial?.area_id ? String(initial.area_id) : 'none')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) return
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        horizon,
        area_id: areaId && areaId !== 'none' ? Number(areaId) : undefined
      })
      onClose()
    },
    [name, description, horizon, areaId, onSave, onClose]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os dados do objetivo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Horizonte *</label>
            <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as GoalHorizon)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">🎯 H3 — Metas (1–2 anos)</SelectItem>
                <SelectItem value="4">🔭 H4 — Visão (3–5 anos)</SelectItem>
                <SelectItem value="5">✨ H5 — Propósito e princípios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tornar-me líder técnico sênior..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Área de Foco</label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma área</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.icon} {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva este objetivo em detalhes..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===================== MAIN PAGE =====================

export function HorizonsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const { areas, loading: areasLoading, createArea, deleteArea } = useAreas()
  const { goals, loading: goalsLoading, createGoal, deleteGoal } = useGoals()
  const { projects, loading: projectsLoading } = useProjects()
  const { tasks, loading: tasksLoading } = useTasks()

  const [areaDialogOpen, setAreaDialogOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  // H0: tasks scheduled for today that are not finished
  const todayTasks = tasks.filter(
    (t) => t.scheduled_date === today && t.status !== 'finalizada' && !t.is_archived
  )

  // H1: active projects
  const activeProjects = projects.filter((p) => p.status === 'active')

  // H3-H5 grouped
  const goalsByHorizon: Record<3 | 4 | 5, Goal[]> = {
    3: goals.filter((g) => g.horizon === 3),
    4: goals.filter((g) => g.horizon === 4),
    5: goals.filter((g) => g.horizon === 5)
  }

  const loading = areasLoading || goalsLoading || projectsLoading || tasksLoading

  const handleCreateArea = useCallback(
    async (data: CreateAreaInput) => {
      await createArea(data)
      toast.success(`Área "${data.name}" criada!`)
    },
    [createArea]
  )

  const handleCreateGoal = useCallback(
    async (data: CreateGoalInput) => {
      await createGoal(data)
      toast.success(`Objetivo "${data.name}" criado!`)
    },
    [createGoal]
  )

  const handleDeleteArea = useCallback(
    async (area: Area) => {
      await deleteArea(area.id)
      toast.success(`Área "${area.name}" removida.`)
    },
    [deleteArea]
  )

  const handleDeleteGoal = useCallback(
    async (goal: Goal) => {
      await deleteGoal(goal.id)
      toast.success(`Objetivo removido.`)
    },
    [deleteGoal]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 px-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-indigo-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Visão de Horizonte GTD</h1>
              <p className="text-xs text-slate-500">6 perspectivas para clareza total</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAreaDialogOpen(true)}
            className="h-9 border-slate-200"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Área
          </Button>
          <Button
            size="sm"
            onClick={() => setGoalDialogOpen(true)}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Star className="mr-1.5 h-4 w-4" />
            Novo Objetivo
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {loading && (
            <div className="text-center py-12 text-slate-400">Carregando horizontes...</div>
          )}

          {/* ==================== H0: PRÓXIMAS AÇÕES ==================== */}
          <HorizonSection
            level={0}
            count={todayTasks.length}
            empty={todayTasks.length === 0}
            emptyText="Nenhuma tarefa agendada para hoje."
          >
            {todayTasks.length > 0 ? (
              <ul className="space-y-2">
                {todayTasks.map((task) => (
                  <li
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <CheckCircle2 className="h-4 w-4 text-slate-300 group-hover:text-blue-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 font-medium">{task.name}</span>
                    {task.project_name && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: task.project_color || '#6366f1' }}
                        />
                        {task.project_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-xs text-orange-500 shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/today')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Ir para Plano do Dia
              </Button>
            )}
          </HorizonSection>

          {/* ==================== H1: PROJETOS ATIVOS ==================== */}
          <HorizonSection
            level={1}
            count={activeProjects.length}
            empty={activeProjects.length === 0}
            emptyText="Nenhum projeto ativo no momento."
          >
            {activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProjects.map((project) => {
                  const pct =
                    project.task_count && project.task_count > 0
                      ? Math.round(((project.completed_task_count || 0) / project.task_count) * 100)
                      : 0
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="p-4 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm text-slate-800 group-hover:text-emerald-700">
                          {project.name}
                        </span>
                        {project.area_name && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {project.area_name}
                          </span>
                        )}
                      </div>
                      {project.next_action && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-1">
                          → {project.next_action}
                        </p>
                      )}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{project.completed_task_count}/{project.task_count} tarefas</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects')}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <FolderKanban className="mr-1.5 h-4 w-4" />
                Ir para Projetos
              </Button>
            )}
          </HorizonSection>

          {/* ==================== H2: ÁREAS DE FOCO ==================== */}
          <HorizonSection
            level={2}
            count={areas.length}
            empty={areas.length === 0}
            emptyText="Nenhuma área de foco definida ainda."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAreaDialogOpen(true)}
                className="h-7 text-violet-600 hover:bg-violet-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            }
          >
            {areas.length > 0 && (
              <ul className="space-y-2">
                {areas.map((area) => {
                  const areaProjects = projects.filter((p) => p.area_id === area.id && p.status === 'active')
                  return (
                    <li
                      key={area.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-violet-200 transition-colors group"
                    >
                      <span className="text-2xl w-8 text-center shrink-0">{area.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-800">{area.name}</span>
                          {areaProjects.length > 0 && (
                            <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                              {areaProjects.length} projeto{areaProjects.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {area.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{area.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingArea(area)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArea(area)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </HorizonSection>

          {/* ==================== H3-H5: OBJETIVOS E VISÃO ==================== */}
          {([3, 4, 5] as const).map((h) => {
            const cfg = HORIZON_CONFIG[h]
            const hGoals = goalsByHorizon[h]
            return (
              <HorizonSection
                key={h}
                level={h}
                count={hGoals.length}
                empty={hGoals.length === 0}
                emptyText={`Nenhum objetivo em ${cfg.label} ainda.`}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGoalDialogOpen(true)
                    }}
                    className={cn('h-7 hover:bg-opacity-10', cfg.textColor)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar
                  </Button>
                }
              >
                {hGoals.length > 0 && (
                  <ul className="space-y-2">
                    {hGoals.map((goal) => (
                      <li
                        key={goal.id}
                        className="flex items-start gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group"
                      >
                        <span className="text-lg shrink-0 mt-0.5">{HORIZON_ICONS[h]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-800">{goal.name}</span>
                            {goal.area_name && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                {goal.area_name}
                              </span>
                            )}
                          </div>
                          {goal.description && (
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => handleDeleteGoal(goal)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </HorizonSection>
            )
          })}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <AreaDialog
        open={areaDialogOpen}
        onClose={() => setAreaDialogOpen(false)}
        onSave={handleCreateArea}
        title="Nova Área de Foco"
      />

      {editingArea && (
        <AreaDialog
          open={!!editingArea}
          onClose={() => setEditingArea(null)}
          onSave={async (data) => {
            await window.api.updateArea(editingArea.id, data)
            setEditingArea(null)
            toast.success('Área atualizada!')
          }}
          initial={editingArea}
          title="Editar Área de Foco"
        />
      )}

      <GoalDialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        onSave={handleCreateGoal}
        areas={areas}
        title="Novo Objetivo"
      />

      {editingGoal && (
        <GoalDialog
          open={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={async (data) => {
            await window.api.updateGoal(editingGoal.id, data)
            setEditingGoal(null)
            toast.success('Objetivo atualizado!')
          }}
          areas={areas}
          initial={editingGoal}
          title="Editar Objetivo"
        />
      )}
    </div>
  )
}

// ===================== HORIZON SECTION =====================

interface HorizonSectionProps {
  level: 0 | 1 | 2 | 3 | 4 | 5
  count: number
  empty: boolean
  emptyText: string
  action?: React.ReactNode
  children: React.ReactNode
}

function HorizonSection({
  level,
  count,
  empty,
  emptyText,
  action,
  children
}: HorizonSectionProps): React.JSX.Element {
  const cfg = HORIZON_CONFIG[level]
  const Icon = cfg.icon

  return (
    <section className={cn('rounded-xl border-2 overflow-hidden', cfg.lightColor)}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg text-white', cfg.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className={cn('text-sm font-semibold', cfg.textColor)}>{cfg.label}</h2>
            <p className="text-xs text-slate-500">{cfg.sublabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.badgeColor)}>
            {count}
          </span>
          {action}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {empty ? (
          <div className="flex flex-col items-center gap-2 py-4 text-slate-400">
            <p className="text-sm">{emptyText}</p>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
