import { useEffect, useState } from 'react'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_AUTO_TIMER_KEY, TERMINAL_SHELL_KEY } from '@renderer/lib/terminalPrefs'
import { ToggleRow } from './SettingsPrimitives'

export function TerminalSettings(): React.JSX.Element {
  const [shell, setShell] = usePersistedState(TERMINAL_SHELL_KEY, '')
  const [autoTimer, setAutoTimer] = usePersistedState(TERMINAL_AUTO_TIMER_KEY, true)
  const [draft, setDraft] = useState(shell)

  useEffect(() => setDraft(shell), [shell])

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">Terminal</p>
      <div className="p-4 rounded-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700" htmlFor="terminal-shell">
          Shell
        </label>
        <p className="text-xs text-slate-500 mt-1 mb-2">
          Caminho do executável. Vazio usa o padrão do sistema ($SHELL; PowerShell no Windows). Vale
          para os próximos terminais.
        </p>
        <input
          id="terminal-shell"
          value={draft}
          placeholder="/bin/zsh"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setShell(draft.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className="w-full h-9 px-3 rounded-lg text-sm font-mono border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
        />
      </div>
      <ToggleRow
        title="Iniciar o timer no primeiro comando"
        description="O primeiro Enter num terminal inicia o timer da task, se ele ainda não estiver rodando."
        checked={autoTimer}
        onChange={() => setAutoTimer(!autoTimer)}
      />
    </div>
  )
}
