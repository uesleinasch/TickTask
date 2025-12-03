import { useState } from 'react'
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
import { CategorySelect } from './CategorySelect'
import type { CreateTaskInput, TaskCategory } from '../../../shared/types'

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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      // Parse time limit (HH:MM:SS or MM:SS or just seconds)
      let timeLimitSeconds: number | undefined
      if (timeLimit.trim()) {
        const parts = timeLimit.split(':').map(Number)
        if (parts.length === 3) {
          timeLimitSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
          timeLimitSeconds = parts[0] * 60 + parts[1]
        } else if (parts.length === 1 && !isNaN(parts[0])) {
          timeLimitSeconds = parts[0] * 60 // Assume minutos se for só um número
        }
      }

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        time_limit_seconds: timeLimitSeconds,
        category
      })

      // Reset form
      setName('')
      setDescription('')
      setTimeLimit('')
      setCategory('normal')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-xl shadow-2xl border-slate-200">
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
