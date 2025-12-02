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
import type { CreateTaskInput } from '../../../shared/types'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskInput) => Promise<void>
}

export function TaskDialog({ open, onOpenChange, onSubmit }: TaskDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
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
        time_limit_seconds: timeLimitSeconds
      })

      // Reset form
      setName('')
      setDescription('')
      setTimeLimit('')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Crie uma nova tarefa para acompanhar seu tempo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da tarefa"
              required
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
          <div className="space-y-2">
            <label htmlFor="timeLimit" className="text-sm font-medium">
              Tempo Limite (opcional)
            </label>
            <Input
              id="timeLimit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="HH:MM:SS ou MM:SS"
            />
            <p className="text-xs text-muted-foreground">
              Ex: 02:00:00 (2 horas), 30:00 (30 minutos), 45 (45 minutos)
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
