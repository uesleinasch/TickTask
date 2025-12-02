import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Archive, BarChart3 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

// Importa o ícone da aplicação
import appIcon from '../../../../resources/32.png'

interface TitleBarProps {
  onNewTask?: () => void
}

export function TitleBar({ onNewTask }: TitleBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const isMainPage = location.pathname === '/'

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-slate-200">
      {/* Lado Esquerdo: Logo + Nome */}
      <div className="flex items-center gap-2">
        <img src={appIcon} alt="TickTask App" className="w-8 h-8" />
        <span className="text-xl font-bold text-slate-900">TickTask App</span>
      </div>

      {/* Lado Direito: Ações */}
      {isMainPage && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/archived')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <Archive className="mr-2 h-4 w-4" />
            Arquivadas
          </Button>
          {onNewTask && (
            <Button
              size="sm"
              onClick={onNewTask}
              className="h-9 bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          )}
        </div>
      )}
    </header>
  )
}
