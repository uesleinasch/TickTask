import { toast } from '@renderer/components/ui/sonner'
import { cn } from '@renderer/lib/utils'

interface TaskIdBadgeProps {
  id: number
  className?: string
}

export function TaskIdBadge({ id, className }: TaskIdBadgeProps): React.JSX.Element {
  const copy = async (event: React.MouseEvent): Promise<void> => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(id))
      toast.success(`ID #${id} copiado`)
    } catch {
      toast.error('Não foi possível copiar o ID')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="ID da tarefa — clique para copiar"
      className={cn(
        'shrink-0 font-mono text-xs tabular-nums text-slate-400 hover:text-slate-700 transition-colors',
        className
      )}
    >
      #{id}
    </button>
  )
}
