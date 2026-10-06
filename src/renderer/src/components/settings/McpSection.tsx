import { useState } from 'react'
import { Copy, KeyRound, Loader2, Server } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { toast } from '@renderer/components/ui/sonner'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import type { McpStatus } from '@shared/types'
import { SectionHeader, ToggleRow } from './SettingsPrimitives'
import { errorMessage, mcpStatusInfo } from './settingsStatus'

export function McpSection({
  status,
  onStatusChange
}: {
  status: McpStatus
  onStatusChange: (status: McpStatus) => void
}): React.JSX.Element {
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  async function regenerate(): Promise<void> {
    setRegenerating(true)
    try {
      onStatusChange(await window.api.mcpRegenerateToken())
      toast.success('Token regenerado. Registre o servidor de novo com o comando novo.')
    } catch (error) {
      toast.error(`Erro ao regenerar token: ${errorMessage(error)}`)
    } finally {
      setRegenerating(false)
    }
  }

  async function copyCommand(): Promise<void> {
    try {
      await navigator.clipboard.writeText(status.command)
      toast.success('Comando copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar o comando')
    }
  }

  const stateText = !status.enabled ? (
    'Desligado'
  ) : status.running ? (
    <span className="text-emerald-600">Rodando em 127.0.0.1:{status.port}</span>
  ) : (
    <span className="text-red-600">
      Falha ao iniciar na porta {status.port}. Verifique se ela já está em uso.
    </span>
  )

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Server}
        title="Servidor MCP"
        description="Exponha o TickTask para assistentes como o Claude Code via MCP."
        status={mcpStatusInfo(status)}
      />

      <ToggleRow
        title="Servidor MCP"
        description={stateText}
        checked={status.enabled}
        onChange={async () => onStatusChange(await window.api.mcpSetEnabled(!status.enabled))}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Comando para registrar no Claude Code</p>
        <div className="flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto bg-slate-900 text-slate-100 text-xs rounded-lg p-3 whitespace-pre-wrap break-all">
            {status.command}
          </pre>
          <Button onClick={copyCommand} variant="outline" className="shrink-0" title="Copiar">
            <Copy size={16} />
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Rode esse comando no terminal para registrar o servidor. Ele contém o token de acesso; não
          compartilhe.
        </p>
      </div>

      <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Regenerar o token invalida o atual: clientes já registrados param de funcionar até serem
          registrados de novo.
        </p>
        <Button
          onClick={() => setConfirmRegenerate(true)}
          disabled={regenerating}
          variant="outline"
          className="shrink-0"
        >
          {regenerating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          Regenerar token
        </Button>
      </div>

      <DeleteConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        onConfirm={regenerate}
        title="Regenerar o token do MCP?"
        description="Todo cliente já registrado (Claude Code, ponte stdio) deixa de funcionar até você registrá-lo de novo com o comando novo."
        confirmLabel="Regenerar"
      />
    </div>
  )
}
