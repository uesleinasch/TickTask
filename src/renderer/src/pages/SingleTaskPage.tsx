import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { StatusSelect } from '@renderer/components/StatusSelect'
import { CategorySelect } from '@renderer/components/CategorySelect'
import { TimeEntryList } from '@renderer/components/TimeEntryList'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { TagInput } from '@renderer/components/TagInput'
import { SubtaskList } from '@renderer/components/SubtaskList'
import { DependencySelector } from '@renderer/components/DependencySelector'
import { RecurrenceSelect } from '@renderer/components/RecurrenceSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog'
import { useTaskDetail } from '@renderer/hooks/useTaskDetail'
import { useTimerStore } from '@renderer/stores/timerStore'
import { useNotification } from '@renderer/hooks/useNotification'
import { formatTime, parseTimeInput } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'
import type { TaskStatus, TaskCategory, Tag, Project, Context, EnergyLevel } from '../../../shared/types'
import { ENERGY_LABELS, ENERGY_ICONS } from '../../../shared/types'
import {
  ArrowLeft,
  Archive,
  Trash2,
  AlertCircle,
  Plus,
  Edit3,
  FolderKanban,
  ListChecks,
  Lock,
  CalendarDays,
  Play,
  Pause,
  RotateCcw,
  Activity
} from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

// ===================== CATEGORY ACCENT STYLES =====================

const CATEGORY_ACCENT: Record<string, { hex: string; startBtn: string; glow: string }> = {
  urgente:    { hex: '#ef4444', startBtn: '#dc2626', glow: 'rgba(239,68,68,0.25)' },
  prioridade: { hex: '#f59e0b', startBtn: '#d97706', glow: 'rgba(245,158,11,0.25)' },
  normal:     { hex: '#3b82f6', startBtn: '#2563eb', glow: 'rgba(59,130,246,0.25)' },
  time_leak:  { hex: '#a855f7', startBtn: '#9333ea', glow: 'rgba(168,85,247,0.25)' }
}

// ===================== SECTION HEADER =====================

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
  )
}

// ===================== MAIN PAGE =====================

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

  // Timer store
  const {
    activeTask,
    displaySeconds: storeSeconds,
    isRunning: storeIsRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    syncWithDatabase
  } = useTimerStore()

  const { notify } = useNotification()

  // Timer is this task?
  const isThisTaskActive = activeTask?.id === taskId
  const displaySeconds = isThisTaskActive ? storeSeconds : (task?.total_seconds || 0)
  const isRunning = isThisTaskActive ? storeIsRunning : false

  // Time limit progress
  const timeLimit = task?.time_limit_seconds
  const progress = timeLimit ? Math.min((displaySeconds / timeLimit) * 100, 100) : 0
  const progressColor = progress >= 100 ? '#ef4444' : progress > 80 ? '#f59e0b' : '#22c55e'

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const notifiedRef = useRef(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimitInput, setTimeLimitInput] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [adjustTime, setAdjustTime] = useState('')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContextIds, setSelectedContextIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | undefined>(undefined)

  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
    window.api.listContexts().then(setContexts).catch(console.error)
  }, [])

  // Sync form state with task
  useEffect(() => {
    if (task) {
      setName(task.name)
      setDescription(task.description || '')
      setTimeLimitInput(task.time_limit_seconds ? formatTime(task.time_limit_seconds) : '')
      setAdjustTime(formatTime(task.total_seconds))
      setSelectedTags(task.tags || [])
      setSelectedProjectId(task.project_id || null)
      setSelectedContextIds(task.contexts?.map((c) => c.id) || [])
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setScheduledDate(task.scheduled_date || '')
      setRecurrenceRule(task.recurrence_rule || null)
      setEnergyLevel(task.energy_level)
    }
  }, [task])

  // Sync timer on mount
  useEffect(() => {
    if (task?.is_running) syncWithDatabase()
  }, [task?.is_running, syncWithDatabase])

  // Time limit notification
  useEffect(() => {
    if (timeLimit && displaySeconds >= timeLimit && !notifiedRef.current) {
      setHasReachedLimit(true)
      notifiedRef.current = true
      notify('Tempo Limite!', `A tarefa "${task?.name}" atingiu o limite de tempo`)
    }
  }, [displaySeconds, timeLimit, task?.name, notify])

  // ===================== HANDLERS =====================

  const handleBlurSave = useCallback(async (): Promise<void> => {
    if (!task) return
    const timeLimitSeconds = timeLimitInput.trim() ? parseTimeInput(timeLimitInput) : undefined
    await updateTask({ name: name.trim(), description: description.trim() || undefined, time_limit_seconds: timeLimitSeconds })
  }, [task, name, description, timeLimitInput, updateTask])

  const handleStatusChange = useCallback(async (status: TaskStatus): Promise<void> => {
    await updateStatus(status)
    toast.success(`Status alterado`)
  }, [updateStatus])

  const handleCategoryChange = useCallback(async (category: TaskCategory): Promise<void> => {
    await updateTask({ category })
  }, [updateTask])

  const handleTagsChange = useCallback(async (tags: Tag[]): Promise<void> => {
    setSelectedTags(tags)
    await updateTask({ tagIds: tags.map((t) => t.id) })
  }, [updateTask])

  const handleProjectChange = useCallback(async (value: string): Promise<void> => {
    const newProjectId = value === 'none' ? null : Number(value)
    setSelectedProjectId(newProjectId)
    await updateTask({ project_id: newProjectId })
    toast.success(newProjectId ? 'Projeto vinculado' : 'Projeto removido')
  }, [updateTask])

  const toggleContext = useCallback(async (contextId: number): Promise<void> => {
    const newIds = selectedContextIds.includes(contextId)
      ? selectedContextIds.filter((cid) => cid !== contextId)
      : [...selectedContextIds, contextId]
    setSelectedContextIds(newIds)
    await updateTask({ contextIds: newIds })
  }, [selectedContextIds, updateTask])

  const handleEnergyChange = useCallback(async (level: EnergyLevel): Promise<void> => {
    const next = energyLevel === level ? undefined : level
    setEnergyLevel(next)
    await updateTask({ energy_level: next || null })
  }, [energyLevel, updateTask])

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
    if (seconds <= 0) { toast.error('Tempo inválido'); return }
    await window.api.addManualTime(taskId, seconds)
    await refreshTask()
    setManualTime('')
    toast.success(`+${formatTime(seconds)} adicionado`)
  }, [taskId, manualTime, refreshTask])

  const handleSetTotalTime = useCallback(async (): Promise<void> => {
    if (!adjustTime.trim()) return
    const seconds = parseTimeInput(adjustTime)
    if (seconds < 0) { toast.error('Tempo inválido'); return }
    await window.api.setTotalTime(taskId, seconds)
    await refreshTask()
    toast.success(`Tempo ajustado para ${formatTime(seconds)}`)
  }, [taskId, adjustTime, refreshTask])

  const handleDueDateChange = useCallback(async (value: string): Promise<void> => {
    setDueDate(value)
    await updateTask({ due_date: value || null })
  }, [updateTask])

  const handleScheduledDateChange = useCallback(async (value: string): Promise<void> => {
    setScheduledDate(value)
    await updateTask({ scheduled_date: value || null })
  }, [updateTask])

  const handleRecurrenceChange = useCallback(async (value: string | null): Promise<void> => {
    setRecurrenceRule(value)
    await updateTask({ recurrence_rule: value })
  }, [updateTask])

  const handleTimerStart = useCallback(async (): Promise<void> => {
    try { await startTimer(taskId) } catch (e) { console.error(e) }
  }, [taskId, startTimer])

  const handleTimerPause = useCallback(async (): Promise<void> => {
    try { await pauseTimer(taskId); onStateChange() } catch (e) { console.error(e) }
  }, [taskId, pauseTimer])

  const handleTimerReset = useCallback(async (): Promise<void> => {
    try {
      await resetTimer(taskId)
      setHasReachedLimit(false)
      notifiedRef.current = false
      onStateChange()
    } catch (e) { console.error(e) }
  }, [taskId, resetTimer])

  const onStateChange = useCallback(() => { refreshTask() }, [refreshTask])

  // ===================== LOADING / NOT FOUND =====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <p className="text-slate-400 font-mono text-sm">carregando...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-100">
        <p className="text-slate-500">Tarefa não encontrada</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    )
  }

  // Computed values
  const accent = CATEGORY_ACCENT[task.category] || CATEGORY_ACCENT.normal
  const projectOptions = [
    { value: 'none', label: 'Nenhum projeto' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name }))
  ]
  const sessionCount = timeEntries.length

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ==================== LEFT SIDEBAR — TASK DETAILS ==================== */}
      <aside
        className="w-[480px] shrink-0 flex flex-col overflow-y-auto bg-white border-r border-slate-200"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Category accent stripe */}
        <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: accent.hex }} />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
          <div className="scale-90 origin-right">
            <CategorySelect value={task.category || 'normal'} onChange={handleCategoryChange} />
          </div>
        </div>

        {/* Task identity */}
        <div className="px-5 pb-5 space-y-2 shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Nome da tarefa"
            className="w-full text-lg font-bold bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-slate-900 focus:outline-none transition-colors text-slate-900 placeholder:text-slate-200 py-1"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Adicione uma descrição..."
            rows={2}
            className="w-full bg-transparent resize-none text-sm text-slate-500 focus:outline-none focus:text-slate-700 hover:text-slate-600 transition-colors placeholder:text-slate-300 leading-relaxed"
          />
        </div>

        {/* ── ORGANIZAÇÃO ── */}
        <div className="px-5 pb-5">
          <SectionHeader icon={FolderKanban} label="Organização" />
          <div className="space-y-3">
            {/* Status */}
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <span className="text-xs text-slate-400">Status</span>
              <StatusSelect value={task.status} onChange={handleStatusChange} />
            </div>

            {/* Projeto */}
            <div className="grid grid-cols-[90px_1fr] items-start gap-3">
              <span className="text-xs text-slate-400 pt-2">Projeto</span>
              <div className="min-w-0">
                <SearchableSelect
                  value={selectedProjectId ? String(selectedProjectId) : 'none'}
                  onChange={handleProjectChange}
                  options={projectOptions}
                  placeholder="Nenhum projeto"
                  searchPlaceholder="Buscar projeto..."
                />
                {task.project_name && (
                  <button
                    onClick={() => navigate(`/project/${task.project_id}`)}
                    className="mt-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    Abrir projeto →
                  </button>
                )}
              </div>
            </div>

            {/* Contextos */}
            {contexts.length > 0 && (
              <div className="grid grid-cols-[90px_1fr] items-start gap-3">
                <span className="text-xs text-slate-400 pt-1.5">Contextos</span>
                <div className="flex flex-wrap gap-1.5">
                  {contexts.map((ctx) => {
                    const isSelected = selectedContextIds.includes(ctx.id)
                    return (
                      <button
                        key={ctx.id}
                        onClick={() => toggleContext(ctx.id)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          isSelected
                            ? 'text-white border-transparent shadow-sm'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                        )}
                        style={isSelected ? { backgroundColor: ctx.color, borderColor: ctx.color } : {}}
                      >
                        <span>{ctx.icon}</span>
                        {ctx.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="grid grid-cols-[90px_1fr] items-start gap-3">
              <span className="text-xs text-slate-400 pt-2">Tags</span>
              <TagInput
                selectedTags={selectedTags}
                onChange={handleTagsChange}
                placeholder="Adicionar tag..."
              />
            </div>
          </div>
        </div>

        {/* ── AGENDA ── */}
        <div className="px-5 pb-5">
          <SectionHeader icon={CalendarDays} label="Agenda" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Programado para</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => handleScheduledDateChange(e.target.value)}
                  className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50 text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Prazo</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50 text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Recorrência</label>
              <RecurrenceSelect value={recurrenceRule} onChange={handleRecurrenceChange} />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Nível de energia</label>
              <div className="flex gap-2">
                {(['alto', 'medio', 'baixo'] as EnergyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleEnergyChange(level)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-medium border transition-all',
                      energyLevel === level
                        ? level === 'alto'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                          : level === 'medio'
                            ? 'bg-amber-50 border-amber-400 text-amber-700'
                            : 'bg-slate-100 border-slate-400 text-slate-600'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    )}
                  >
                    <span>{ENERGY_ICONS[level]}</span>
                    {ENERGY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SUBTAREFAS ── */}
        {!task.parent_task_id && (
          <div className="px-5 pb-5">
            <SectionHeader icon={ListChecks} label="Subtarefas" />
            <SubtaskList
              parentTaskId={task.id}
              isParentBlocked={task.is_blocked}
              onSubtaskChange={refreshTask}
            />
          </div>
        )}

        {/* ── DEPENDÊNCIAS ── */}
        <div className="px-5 pb-5">
          <SectionHeader icon={Lock} label="Depende de" />
          <DependencySelector taskId={task.id} onDependenciesChange={refreshTask} />
        </div>

        {/* ── HISTÓRICO ── */}
        {timeEntries.length > 0 && (
          <div className="px-5 pb-5">
            <SectionHeader icon={Activity} label="Histórico de sessões" />
            <TimeEntryList entries={timeEntries} />
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="px-5 pb-6 flex gap-2 mt-auto shrink-0 pt-4">
          <button
            onClick={handleArchive}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <Archive size={13} /> Arquivar
          </button>
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 size={13} /> Deletar
          </button>
        </div>
      </aside>

      {/* ==================== CENTER — TIMER HERO ==================== */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-slate-50 px-8">
        <div className="flex flex-col items-center w-full max-w-sm">

          {/* Blocked warning */}
          {task.is_blocked && (
            <div className="w-full flex items-center gap-2 px-4 py-2.5 mb-8 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 text-sm">
              <Lock size={14} />
              Bloqueada por dependências
            </div>
          )}

          {/* Time display */}
          <div
            className={cn(
              'font-mono font-bold tabular-nums tracking-tighter transition-all duration-300 select-none leading-none',
              hasReachedLimit ? 'text-red-500' : isRunning ? 'text-slate-900' : 'text-slate-300',
              displaySeconds >= 3600 ? 'text-7xl' : 'text-8xl'
            )}
            style={isRunning ? { textShadow: `0 0 60px ${accent.glow}, 0 0 20px ${accent.glow}` } : undefined}
          >
            {formatTime(displaySeconds)}
          </div>

          {/* Running pulse / idle hint */}
          <div className="h-7 flex items-center mt-3 mb-8">
            {isRunning ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-emerald-600 font-medium tracking-wide">em andamento</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 tracking-widest uppercase">pronto para iniciar</span>
            )}
          </div>

          {/* Progress bar */}
          {timeLimit && timeLimit > 0 && (
            <div className="w-full mb-8">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{Math.round(progress)}%</span>
                <span className="font-mono">limite {formatTime(timeLimit)}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: progressColor }}
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 w-full mb-8">
            {!isRunning ? (
              <button
                onClick={handleTimerStart}
                disabled={task.is_blocked}
                className={cn(
                  'flex-1 h-13 rounded-xl flex items-center justify-center gap-2.5',
                  'text-base font-semibold text-white transition-all duration-150 shadow-md',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'active:scale-[0.98] hover:brightness-110'
                )}
                style={{
                  backgroundColor: task.is_blocked ? '#94a3b8' : accent.startBtn,
                  boxShadow: task.is_blocked ? 'none' : `0 4px 20px ${accent.glow}`
                }}
              >
                <Play size={18} className="fill-current" />
                Iniciar
              </button>
            ) : (
              <button
                onClick={handleTimerPause}
                className="flex-1 h-13 rounded-xl flex items-center justify-center gap-2.5 text-base font-semibold text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:text-slate-900 bg-white transition-all active:scale-[0.98] shadow-sm"
              >
                <Pause size={18} className="fill-current" />
                Pausar
              </button>
            )}

            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className="h-13 w-13 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 border-2 border-slate-200 hover:border-red-200 transition-all bg-white shadow-sm">
                  <RotateCcw size={18} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar Timer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todo o tempo registrado será zerado. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleTimerReset} className="bg-red-500 hover:bg-red-600">
                    Resetar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Stats */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Tempo total</p>
              <p className="text-lg font-mono font-bold text-slate-700">{formatTime(task.total_seconds)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Sessões</p>
              <p className="text-lg font-mono font-bold text-slate-700">{sessionCount}</p>
            </div>
          </div>

          {/* Time controls */}
          <div className="w-full space-y-3">
            {/* Add manual time */}
            <div>
              <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Plus size={11} /> Adicionar tempo
              </p>
              <div className="flex gap-2">
                <input
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  placeholder="01:30:00"
                  className="flex-1 h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 shadow-sm min-w-0"
                />
                <button
                  onClick={handleAddManualTime}
                  disabled={!manualTime.trim()}
                  className="h-9 px-4 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 bg-white shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Adjust total */}
            <div>
              <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Edit3 size={11} /> Ajustar total
              </p>
              <div className="flex gap-2">
                <input
                  value={adjustTime}
                  onChange={(e) => setAdjustTime(e.target.value)}
                  className="flex-1 h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 shadow-sm min-w-0"
                />
                <button
                  onClick={handleSetTotalTime}
                  disabled={!adjustTime.trim()}
                  className="h-9 px-4 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 bg-white shadow-sm"
                >
                  Definir
                </button>
              </div>
            </div>

            {/* Time limit */}
            <div>
              <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <AlertCircle size={11} /> Limite de tempo
              </p>
              <div className="flex gap-2">
                <input
                  value={timeLimitInput}
                  onChange={(e) => setTimeLimitInput(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="00:00:00"
                  className="flex-1 h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 shadow-sm min-w-0"
                />
                <button
                  onClick={handleBlurSave}
                  className="h-9 px-4 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 bg-white shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
