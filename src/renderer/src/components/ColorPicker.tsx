import { cn } from '@renderer/lib/utils'

// Paleta padrão de cores (mesma usada em Contextos)
export const DEFAULT_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#ef4444',
  '#84cc16'
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
  label?: string
}

export function ColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  label = 'Cor'
}: ColorPickerProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'w-8 h-8 rounded-full transition-all',
              value === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'
            )}
            style={{ backgroundColor: c }}
            aria-label={`Selecionar cor ${c}`}
          />
        ))}
      </div>
    </div>
  )
}
