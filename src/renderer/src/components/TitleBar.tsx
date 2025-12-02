import { useNavigate, useLocation } from 'react-router-dom'
import { Minus, Square, X, Plus, Archive } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface TitleBarProps {
  onNewTask?: () => void
}

export function TitleBar({ onNewTask }: TitleBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const isMainPage = location.pathname === '/'

  const handleMinimize = (): void => {
    window.api.minimizeWindow()
  }

  const handleMaximize = (): void => {
    window.api.maximizeWindow()
  }

  const handleClose = (): void => {
    window.api.closeWindow()
  }

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-background border-b select-none app-drag">
      {/* Lado Esquerdo: Nome do App + Ações */}
      <div className="flex items-center gap-4 app-no-drag">
        <span className="text-lg font-bold text-foreground cursor-default app-drag">⏱️ TickTask</span>
        
        {isMainPage && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/archived')}
              className="h-8 bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Arquivadas
            </Button>
            {onNewTask && (
              <Button size="sm" className="h-8" onClick={onNewTask}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova Tarefa
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lado Direito: Controles da Janela */}
      <div className="flex items-center app-no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none text-foreground hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none text-foreground hover:bg-muted"
          onClick={handleMaximize}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-10 rounded-none text-foreground hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
