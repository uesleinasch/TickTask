import { SquareTerminal } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { TERMINAL_SHORTCUT_LABEL } from './terminalKeys'

interface TerminalTaskButtonProps {
  taskId: number
  workingDir: string | null | undefined
  onWorkingDirChange: () => Promise<void>
}

export function TerminalTaskButton({
  taskId,
  workingDir,
  onWorkingDirChange
}: TerminalTaskButtonProps): React.JSX.Element {
  const isShowingTask = useTerminalStore(
    (s) => s.open && s.sessions.find((session) => session.id === s.activeId)?.taskId === taskId
  )

  const handleClick = async (): Promise<void> => {
    if (!workingDir) {
      const dir = await window.api.terminalPickDirectory(taskId)
      if (!dir) return
      await onWorkingDirChange()
    }
    await useTerminalStore.getState().toggleForTask(taskId)
  }

  return (
    <button
      onClick={() => void handleClick()}
      title={
        workingDir
          ? `Terminal em ${workingDir} (${TERMINAL_SHORTCUT_LABEL})`
          : 'Escolher o diretório de trabalho e abrir o terminal'
      }
      className={cn(
        'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
        isShowingTask
          ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
          : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400'
      )}
    >
      <SquareTerminal size={14} />
      Terminal
    </button>
  )
}
