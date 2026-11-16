import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path
}

interface WorkingDirFieldProps {
  taskId: number
  workingDir: string | null | undefined
  startCommand: string | null | undefined
  onChange: () => Promise<void>
}

export function WorkingDirField({
  taskId,
  workingDir,
  startCommand,
  onChange
}: WorkingDirFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(startCommand ?? '')

  useEffect(() => {
    setDraft(startCommand ?? '')
  }, [startCommand])

  const pick = async (): Promise<void> => {
    const dir = await window.api.terminalPickDirectory(taskId)
    if (dir) await onChange()
  }

  const commitCommand = async (): Promise<void> => {
    const next = draft.trim()
    if (next === (startCommand ?? '')) return
    await window.api.terminalSetTaskWorkspace(taskId, { start_command: next || null })
    await onChange()
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Diretório de trabalho</label>
        <div className="flex gap-2">
          <div
            title={workingDir ?? undefined}
            className="flex-1 min-w-0 flex items-center h-8 px-2 rounded-lg text-xs border border-slate-200 bg-slate-50 font-mono text-slate-600"
          >
            <span className="truncate">
              {workingDir ? (
                shortPath(workingDir)
              ) : (
                <span className="font-sans text-slate-400">Nenhum</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void pick()}
            title={workingDir ? 'Alterar diretório' : 'Escolher diretório'}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {workingDir ? 'Alterar' : 'Escolher'}
          </button>
        </div>
      </div>
      {workingDir && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Comando ao abrir o terminal</label>
          <input
            value={draft}
            placeholder="npm run dev"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commitCommand()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full h-8 px-2 rounded-lg text-xs font-mono border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
          />
        </div>
      )}
    </div>
  )
}
