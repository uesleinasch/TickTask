import { SquareTerminal } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { TERMINAL_SHORTCUT_LABEL } from './terminalKeys'

export function TerminalToggleButton(): React.JSX.Element | null {
  const count = useTerminalStore((s) => s.sessions.length)
  const open = useTerminalStore((s) => s.open)
  const toggle = useTerminalStore((s) => s.toggle)

  if (count === 0) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      title={`${open ? 'Esconder' : 'Mostrar'} terminais (${TERMINAL_SHORTCUT_LABEL})`}
      className={cn(
        'h-9',
        open
          ? 'border-orange-500 bg-orange-500 text-white hover:bg-orange-600 hover:text-white'
          : 'border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700'
      )}
    >
      <SquareTerminal className="mr-2 h-4 w-4" />
      {count}
    </Button>
  )
}
