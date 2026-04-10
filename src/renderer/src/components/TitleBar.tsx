import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Archive, BarChart3, Settings, FolderKanban, MapPin, ClipboardCheck, CalendarDays, Mountain, Calendar } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

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
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            title="Configurações"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
            title="Calendário"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendário
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/today')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
            title="Plano do Dia"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/review')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
            title="Revisão Semanal"
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Revisão
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/contexts')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
            title="Contextos GTD"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Contextos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/horizons')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
            title="Visão de Horizonte GTD"
          >
            <Mountain className="mr-2 h-4 w-4" />
            Horizontes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/projects')}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Projetos
          </Button>
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
