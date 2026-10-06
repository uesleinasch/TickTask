import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/sonner'
import type { GcalStatus } from '@shared/types'

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    : 'Erro desconhecido'

export function GoogleCalendarSettings(): React.JSX.Element {
  const [status, setStatus] = useState<GcalStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null)

  useEffect(() => {
    window.api.gcalGetStatus().then((loaded) => {
      setStatus(loaded)
      setClientId(loaded.clientId)
    })
  }, [])

  const credentialsChanged =
    !!status && (clientId.trim() !== status.clientId || clientSecret.trim() !== '')
  const canConnect =
    clientId.trim() !== '' && (clientSecret.trim() !== '' || !!status?.hasClientSecret)

  async function handleConnect(): Promise<void> {
    setBusy('connect')
    try {
      if (credentialsChanged) await window.api.gcalSaveCredentials(clientId, clientSecret)
      setClientSecret('')
      toast.info('Conclua a autorização no navegador que acabou de abrir.')
      setStatus(await window.api.gcalConnect())
      toast.success('Google Calendar conectado. A agenda "TickTask" está pronta.')
    } catch (error) {
      toast.error(errorMessage(error))
      setStatus(await window.api.gcalGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleSyncAll(): Promise<void> {
    setBusy('sync')
    try {
      const result = await window.api.gcalSyncAll()
      if (result.failed > 0) {
        toast.warning(`${result.success} tarefas sincronizadas, ${result.failed} com erro.`)
      } else {
        toast.success(`${result.success} tarefas sincronizadas com o Google Calendar.`)
      }
    } catch (error) {
      toast.error(errorMessage(error))
      setStatus(await window.api.gcalGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect(): Promise<void> {
    setBusy('disconnect')
    try {
      setStatus(await window.api.gcalDisconnect())
      toast.success('Google Calendar desconectado. A agenda "TickTask" continua no Google.')
    } finally {
      setBusy(null)
    }
  }

  async function toggleAutoSync(): Promise<void> {
    if (!status) return
    setStatus(await window.api.gcalSetAutoSync(!status.autoSync))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-900 rounded-lg">
          <CalendarDays size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
          <p className="text-sm text-slate-500">
            Leve blocos, datas agendadas e prazos das tarefas marcadas para a agenda “TickTask”
          </p>
        </div>
      </div>

      {status?.connected && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check size={16} />
          <span>Conectado. Marque “Google Calendar” na seção Agenda de cada tarefa.</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Client ID</label>
        <Input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          className="bg-slate-50 border-slate-200"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Client Secret</label>
        <Input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder={status?.hasClientSecret ? '•••••••• (salvo)' : 'GOCSPX-xxxxxxxx'}
          className="bg-slate-50 border-slate-200"
        />
      </div>

      <details className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <summary className="cursor-pointer font-medium text-slate-700 flex items-center gap-1">
          <AlertCircle size={12} /> Como obter as credenciais
        </summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>
            No{' '}
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              Google Cloud Console
              <ExternalLink size={10} />
            </a>
            , crie um projeto e ative a <strong>Google Calendar API</strong>.
          </li>
          <li>Configure a tela de consentimento OAuth como “Externo”.</li>
          <li>
            Em Credenciais, crie um <strong>ID do cliente OAuth</strong> do tipo{' '}
            <strong>App para computador</strong> e copie o ID e a chave secreta para cá.
          </li>
          <li>
            Publique o app (<strong>Em produção</strong>). Em “Teste”, o Google invalida o acesso a
            cada 7 dias e você precisaria reconectar toda semana.
          </li>
        </ol>
      </details>

      {status?.connected && (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="text-sm font-medium text-slate-700">Sincronização Automática</label>
            <p className="text-xs text-slate-500 mt-0.5">
              Atualiza a agenda a cada mudança nas tarefas marcadas
            </p>
          </div>
          <button
            onClick={toggleAutoSync}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              status.autoSync ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                status.autoSync ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {(!status?.connected || credentialsChanged) && (
          <Button
            onClick={handleConnect}
            disabled={busy !== null || !canConnect}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
          >
            {busy === 'connect' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Conectar
          </Button>
        )}
        {status?.connected && (
          <>
            <Button
              onClick={handleSyncAll}
              disabled={busy !== null}
              variant="outline"
              className="flex items-center gap-2"
            >
              {busy === 'sync' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Ressincronizar todas
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={busy !== null}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut size={16} />
              Desconectar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
