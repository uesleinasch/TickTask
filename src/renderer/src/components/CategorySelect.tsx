import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { AlertTriangle, Flag, Circle, Clock } from 'lucide-react'
import type { TaskCategory } from '../../../shared/types'
import { CATEGORY_LABELS } from '../../../shared/types'

interface CategorySelectProps {
  value: TaskCategory
  onChange: (value: TaskCategory) => void
  disabled?: boolean
}

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  urgente: <AlertTriangle size={14} className="text-red-500" />,
  prioridade: <Flag size={14} className="text-orange-500" />,
  normal: <Circle size={14} className="text-blue-500" />,
  time_leak: <Clock size={14} className="text-yellow-500" />
}

const categoryStyles: Record<TaskCategory, string> = {
  urgente: 'text-red-600 bg-red-50 border-red-200',
  prioridade: 'text-orange-600 bg-orange-50 border-orange-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  time_leak: 'text-yellow-600 bg-yellow-50 border-yellow-200'
}

export function CategorySelect({
  value,
  onChange,
  disabled = false
}: CategorySelectProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`w-[140px] h-8 text-xs font-medium border ${categoryStyles[value]}`}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {categoryIcons[value]}
            <span>{CATEGORY_LABELS[value]}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white">
        {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((cat) => (
          <SelectItem key={cat} value={cat} className="text-sm">
            <div className="flex items-center gap-2">
              {categoryIcons[cat]}
              <span>{CATEGORY_LABELS[cat]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
