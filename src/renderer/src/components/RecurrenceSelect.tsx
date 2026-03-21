import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import type { RecurrenceRule } from '../../../shared/types'

interface RecurrenceSelectProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
}

const OPTIONS = [
  { value: 'none', label: 'Não repete' },
  { value: JSON.stringify({ type: 'daily' } satisfies RecurrenceRule), label: 'Diariamente' },
  { value: JSON.stringify({ type: 'weekly' } satisfies RecurrenceRule), label: 'Semanalmente' },
  { value: JSON.stringify({ type: 'monthly' } satisfies RecurrenceRule), label: 'Mensalmente' }
]

export function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps): React.JSX.Element {
  const currentValue = value || 'none'

  return (
    <Select
      value={currentValue}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
    >
      <SelectTrigger className="border-slate-300 h-8 text-sm">
        <SelectValue placeholder="Não repete" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
