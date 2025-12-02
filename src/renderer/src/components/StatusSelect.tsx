import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { TaskStatus } from '../../../shared/types'
import { STATUS_LABELS } from '../../../shared/types'

interface StatusSelectProps {
  value: TaskStatus
  onChange: (status: TaskStatus) => void
  disabled?: boolean
}

const statuses: TaskStatus[] = ['inbox', 'aguardando', 'proximas', 'executando', 'finalizada']

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TaskStatus)} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione um status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
