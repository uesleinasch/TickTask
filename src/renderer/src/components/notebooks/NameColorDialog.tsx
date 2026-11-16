import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { ColorPicker } from '@renderer/components/ColorPicker'

export interface NameColorValue {
  name: string
  color: string
}

interface NameColorDialogProps {
  open: boolean
  title: string
  initial: NameColorValue
  placeholder?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (value: NameColorValue) => Promise<void>
}

export function NameColorDialog({
  open,
  title,
  initial,
  placeholder,
  onOpenChange,
  onSubmit
}: NameColorDialogProps): React.JSX.Element {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setColor(initial.color)
  }, [open, initial.name, initial.color])

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), color })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
