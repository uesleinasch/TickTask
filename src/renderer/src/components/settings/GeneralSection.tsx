import { Settings } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'
import { SectionHeader, ToggleRow } from './SettingsPrimitives'

export function GeneralSection({
  autostart,
  onAutostartChange
}: {
  autostart: boolean
  onAutostartChange: (enabled: boolean) => void
}): React.JSX.Element {
  async function toggleAutostart(): Promise<void> {
    const next = await window.api.appSetAutostart(!autostart)
    onAutostartChange(next)
    if (next === autostart) toast.error('Não foi possível alterar a inicialização automática')
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Settings}
        title="Geral"
        description="Como o TickTask se comporta no seu sistema."
      />

      <ToggleRow
        title="Iniciar o TickTask com o sistema"
        description={
          autostart
            ? 'Ativado: o app sobe na bandeja ao fazer login, sem abrir janela.'
            : 'Desativado: o app só abre quando você mandar.'
        }
        checked={autostart}
        onChange={toggleAutostart}
      />

      <div className="grid gap-3">
        <div className="p-4 rounded-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-700">Fechar a janela não encerra o app</p>
          <p className="text-xs text-slate-500 mt-1">
            O TickTask continua na bandeja do sistema, com timers e servidor MCP rodando. Para
            encerrar de vez, use <strong>Sair</strong> no ícone da bandeja.
          </p>
        </div>
        <div className="p-4 rounded-sm border border-slate-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Captura rápida</p>
            <p className="text-xs text-slate-500 mt-1">
              Atalho global que abre a janela de captura de qualquer lugar.
            </p>
          </div>
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {window.electron.process.platform === 'darwin' ? '⌘' : 'Ctrl'} + Shift + Space
          </kbd>
        </div>
      </div>
    </div>
  )
}
