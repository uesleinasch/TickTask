import { X } from 'lucide-react'

export function TimeInput({
  value,
  onChange,
  label,
  min
}: {
  value: string
  onChange: (value: string) => void
  label: string
  min?: string
}): React.JSX.Element {
  return (
    <div className="min-w-0 flex-1">
      <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      <div className="relative">
        <input
          type="time"
          value={value}
          min={min}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 text-xs border border-slate-200 rounded-lg pl-2 pr-6 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50 text-slate-700"
        />
        {value && (
          <button
            type="button"
            title={`Limpar ${label.toLowerCase()}`}
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
