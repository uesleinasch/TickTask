import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { CategorySelect } from './CategorySelect'
import { TagInput } from './TagInput'
import { RecurrenceSelect } from './RecurrenceSelect'
import type { CreateTaskInput, TaskCategory, Tag, Project, Context, EnergyLevel } from '../../../shared/types'
import { ENERGY_LABELS, ENERGY_ICONS } from '../../../shared/types'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskInput) => Promise<void>
}

export function TaskDialog({ open, onOpenChange, onSubmit }: TaskDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [category, setCategory] = useState<TaskCategory>('normal')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [projectId, setProjectId] = useState<number | undefined>(undefined)
  const [selectedContextIds, setSelectedContextIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])

  useEffect(() => {
    if (open) {
      window.api.listProjects('active').then(setProjects).catch(console.error)
      window.api.listContexts().then(setContexts).catch(console.error)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      let timeLimitSeconds: number | undefined
      if (timeLimit.trim()) {
        const parts = timeLimit.split(':').map(Number)
        if (parts.length === 3) {
          timeLimitSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
          timeLimitSeconds = parts[0] * 60 + parts[1]
        } else if (parts.length === 1 && !isNaN(parts[0])) {
          timeLimitSeconds = parts[0] * 60
        }
      }

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        time_limit_seconds: timeLimitSeconds,
        category,
        tagIds: selectedTags.map((t) => t.id),
        project_id: projectId,
        contextIds: selectedContextIds.length > 0 ? selectedContextIds : undefined,
        due_date: dueDate || undefined,
        scheduled_date: scheduledDate || undefined,
        recurrence_rule: recurrenceRule || undefined,
        energy_level: energyLevel
      })

      // Reset form
      setName('')
      setDescription('')
      setTimeLimit('')
      setCategory('normal')
      setSelectedTags([])
      setProjectId(undefined)
      setSelectedContextIds([])
      setDueDate('')
      setScheduledDate('')
      setRecurrenceRule(null)
      setEnergyLevel(undefined)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const projectOptions = [
    { value: 'none', label: 'Nenhum' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name }))
  ]

  const toggleContext = (contextId: number): void => {
    setSelectedContextIds((prev) =>
      prev.includes(contextId) ? prev.filter((id) => id !== contextId) : [...prev, contextId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-xl shadow-2xl border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Nova Tarefa</DialogTitle>
          <DialogDescription className="text-slate-500">
            Crie uma nova tarefa para acompanhar seu tempo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nome *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Refatorar módulo de login"
              required
              className="border-slate-300 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Descrição (Opcional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre a tarefa..."
              rows={3}
              className="border-slate-300 focus:ring-slate-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <CategorySelect value={category} onChange={setCategory} />
            </div>
            <div className="space-y-2">
              <label htmlFor="timeLimit" className="text-sm font-medium text-slate-700">
                Tempo Limite
              </label>
              <Input
                id="timeLimit"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="00:00:00"
                className="border-slate-300 focus:ring-slate-900 font-mono h-8"
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="scheduledDate" className="text-sm font-medium text-slate-700">
                Programar para
              </label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="border-slate-300 focus:ring-slate-900 h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dueDate" className="text-sm font-medium text-slate-700">
                Prazo
              </label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-slate-300 focus:ring-slate-900 h-8 text-sm"
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Recorrência</label>
            <RecurrenceSelect value={recurrenceRule} onChange={setRecurrenceRule} />
          </div>

          {/* Projeto */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Projeto</label>
              <SearchableSelect
                value={projectId ? String(projectId) : 'none'}
                onChange={(value) => setProjectId(value === 'none' ? undefined : Number(value))}
                options={projectOptions}
                placeholder="Selecione um projeto..."
                searchPlaceholder="Buscar projeto..."
              />
            </div>
          )}

          {/* Contextos */}
          {contexts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Contextos</label>
              <div className="flex flex-wrap gap-2">
                {contexts.map((ctx) => {
                  const isSelected = selectedContextIds.includes(ctx.id)
                  return (
                    <button
                      key={ctx.id}
                      type="button"
                      onClick={() => toggleContext(ctx.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                        ${
                          isSelected
                            ? 'text-white'
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
          )}

          {/* Nível de Energia */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nível de Energia</label>
            <div className="flex gap-2">
              {(['alto', 'medio', 'baixo'] as EnergyLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(energyLevel === level ? undefined : level)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    energyLevel === level
                      ? level === 'alto'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : level === 'medio'
                          ? 'bg-amber-100 border-amber-500 text-amber-700'
                          : 'bg-slate-100 border-slate-400 text-slate-600'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span>{ENERGY_ICONS[level]}</span>
                  {ENERGY_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Fontes / Tags</label>
            <TagInput
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              placeholder="Digite uma fonte e pressione Enter..."
            />
            <p className="text-xs text-slate-500">Ex: E-mail, Trabalho, Pessoal, Cliente X</p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {loading ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
