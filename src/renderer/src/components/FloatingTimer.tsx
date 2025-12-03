import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { formatTime } from '@renderer/lib/utils'
import { Activity, Maximize2 } from 'lucide-react'
import { useTimerStore } from '@renderer/stores/timerStore'

export function FloatingTimer(): React.JSX.Element | null {
  const navigate = useNavigate()
  const location = useLocation()
  // A timerStore gerencia todo o estado - não precisamos de polling aqui
  const { activeTask, displaySeconds, isRunning, syncWithDatabase } = useTimerStore()

  // Sincronizar apenas UMA VEZ ao montar o componente
  // O resto é gerenciado pela timerStore
  useEffect(() => {
    syncWithDatabase()
    // Não fazer polling - a timerStore é a fonte da verdade
  }, [syncWithDatabase])

  // REMOVIDO: useEffect que chamava startInterval/stopInterval
  // A timerStore agora é a única responsável por gerenciar o interval

  // Não mostrar se não há task ativa ou se estamos na página da task ativa
  if (!activeTask || !isRunning) {
    return null
  }

  // Não mostrar se estamos na página desta task
  const isOnTaskPage = location.pathname === `/task/${activeTask.id}`
  if (isOnTaskPage) {
    return null
  }

  const handleClick = (): void => {
    navigate(`/task/${activeTask.id}`)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <button
        onClick={handleClick}
        className="group flex items-center gap-3 bg-slate-900 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 border border-slate-700 cursor-pointer"
      >
        {/* Ícone Animado */}
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-emerald-500 rounded-full p-1.5">
            <Activity size={16} className="text-white" />
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-start min-w-[80px]">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            Executando
          </span>
          <span className="font-mono font-bold text-lg leading-none tabular-nums">
            {formatTime(displaySeconds)}
          </span>
        </div>

        {/* Expand Icon */}
        <div className="border-l border-slate-700 pl-3 ml-1 text-slate-400 group-hover:text-white transition-colors">
          <Maximize2 size={18} />
        </div>
      </button>
    </div>
  )
}
