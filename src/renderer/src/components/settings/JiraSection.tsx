import { useState } from 'react'
import { Loader2, LogOut, RefreshCw, Ticket } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/sonner'
import type { JiraStatus } from '@shared/types'
import { SectionHeader, ToggleRow } from './SettingsPrimitives'
import { errorMessage, jiraStatusInfo } from './settingsStatus'

const AUTO_IMPORT_OPTIONS = [
  { value: 0, label: 'Desligado' },
  { value: 15, label: 'A cada 15 min' },
  { value: 30, label: 'A cada 30 min' },
  { value: 60, label: 'A cada hora' }
]

export function JiraSection({
  status,
  onStatusChange
}: {
  status: JiraStatus
  onStatusChange: (status: JiraStatus) => void
}): React.JSX.Element {
  const [site, setSite] = useState(status.site)
  const [email, setEmail] = useState(status.email)
  const [apiToken, setApiToken] = useState('')
  const [busy, setBusy] = useState<'save' | 'boards' | 'disconnect' | null>(null)

  async function handleSave(): Promise<void> {
    setBusy('save')
    try {
      const saved = await window.api.jiraSaveCredentials({ site, email, apiToken })
      setApiToken('')
      onStatusChange(saved)
      const me = await window.api.jiraTest()
      toast.success(`Jira conectado como ${me.displayName}.`)
    } catch (error) {
      toast.error(errorMessage(error))
      onStatusChange(await window.api.jiraGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleLoadBoards(): Promise<void> {
    setBusy('boards')
    try {
      await window.api.jiraListBoards()
      onStatusChange(await window.api.jiraGetStatus())
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function toggleBoard(boardId: number): Promise<void> {
    const next = status.boardIds.includes(boardId)
      ? status.boardIds.filter((id) => id !== boardId)
      : [...status.boardIds, boardId]
    onStatusChange(await window.api.jiraSaveBoards(next))
  }

  async function handleDisconnect(): Promise<void> {
    setBusy('disconnect')
    try {
      onStatusChange(await window.api.jiraDisconnect())
      setApiToken('')
      toast.success('Jira desconectado.')
    } finally {
      setBusy(null)
    }
  }

  const credentialsChanged =
    site.trim() !== status.site || email.trim() !== status.email || apiToken.trim() !== ''

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Ticket}
        title="Jira"
        description="Carrega as issues atribuídas a você dos boards escolhidos como tasks e pode refletir o status de volta no Jira."
        status={jiraStatusInfo(status)}
      />

      <div className="grid gap-2">
        <label className="text-xs font-medium text-slate-700">
          Site do Jira Cloud
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="sua-empresa.atlassian.net"
            className="mt-1 bg-white border-slate-200"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          E-mail da conta Atlassian
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="mt-1 bg-white border-slate-200"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          API token
          <Input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder={status.hasToken ? '•••••••• (salvo)' : 'Cole o token gerado na Atlassian'}
            className="mt-1 bg-white border-slate-200"
          />
        </label>
        <p className="text-xs text-slate-500">
          Gere o token em id.atlassian.com → Segurança → Criar token de API. O token fica
          criptografado no seu computador e nunca aparece depois de salvo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSave}
          disabled={
            busy !== null || !site.trim() || !email.trim() || !(apiToken.trim() || status.hasToken)
          }
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          {busy === 'save' && <Loader2 size={16} className="animate-spin" />}
          {credentialsChanged || !status.connected ? 'Salvar e testar' : 'Testar conexão'}
        </Button>
        {status.connected && (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut size={16} />
            Desconectar
          </Button>
        )}
      </div>

      {status.connected && (
        <>
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-800">Boards</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadBoards}
                disabled={busy !== null}
              >
                {busy === 'boards' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Carregar boards
              </Button>
            </div>
            {status.boards.length === 0 ? (
              <p className="text-xs text-slate-500">
                Carregue os boards do seu Jira e marque os que devem alimentar o TickTask.
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {status.boards.map((board) => (
                  <li key={board.id}>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={status.boardIds.includes(board.id)}
                        onChange={() => toggleBoard(board.id)}
                        className="h-4 w-4 accent-slate-900"
                      />
                      {board.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <ToggleRow
              title="Enviar status ao Jira"
              description="Ao mudar o status de uma task vinculada, o TickTask tenta fazer a transição correspondente na issue."
              checked={status.pushStatus}
              onChange={async () =>
                onStatusChange(await window.api.jiraSaveOptions({ pushStatus: !status.pushStatus }))
              }
            />
            <ToggleRow
              title="Sincronizar tasks do Jira com o Notion"
              description="Envia as tasks vinculadas ao Jira para o banco do Notion, junto com as demais."
              checked={status.syncToNotion}
              onChange={async () =>
                onStatusChange(
                  await window.api.jiraSaveOptions({ syncToNotion: !status.syncToNotion })
                )
              }
            />
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              Importação automática
              <select
                value={status.autoImportMinutes}
                onChange={async (e) =>
                  onStatusChange(
                    await window.api.jiraSaveOptions({ autoImportMinutes: Number(e.target.value) })
                  )
                }
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {AUTO_IMPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  )
}
