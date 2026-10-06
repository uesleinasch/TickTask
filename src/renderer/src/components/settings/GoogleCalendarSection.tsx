import { useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/sonner'
import type { GcalStatus } from '@shared/types'
import { SetupSteps, type SetupStep } from './SetupSteps'
import { Callout, OutLink, SectionHeader, ToggleRow } from './SettingsPrimitives'
import { errorMessage, gcalStatusInfo } from './settingsStatus'

export function GoogleCalendarSection({
  status,
  onStatusChange
}: {
  status: GcalStatus
  onStatusChange: (status: GcalStatus) => void
}): React.JSX.Element {
  const [clientId, setClientId] = useState(status.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState<'save' | 'connect' | 'sync' | 'disconnect' | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const credentialsChanged = clientId.trim() !== status.clientId || clientSecret.trim() !== ''
  const credentialsSaved = status.clientId !== '' && status.hasClientSecret
  const canConnect =
    clientId.trim() !== '' && (clientSecret.trim() !== '' || status.hasClientSecret)

  async function saveCredentials(): Promise<GcalStatus> {
    const next = await window.api.gcalSaveCredentials(clientId, clientSecret)
    setClientSecret('')
    onStatusChange(next)
    return next
  }

  async function handleSave(): Promise<void> {
    setBusy('save')
    try {
      await saveCredentials()
      toast.success('Credenciais salvas.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleConnect(): Promise<void> {
    setBusy('connect')
    try {
      if (credentialsChanged) await saveCredentials()
      toast.info('Conclua a autorização no navegador que acabou de abrir.')
      onStatusChange(await window.api.gcalConnect())
      setShowGuide(false)
      toast.success('Google Calendar conectado. A agenda "TickTask" está pronta.')
    } catch (error) {
      toast.error(errorMessage(error))
      onStatusChange(await window.api.gcalGetStatus())
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
      onStatusChange(await window.api.gcalGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect(): Promise<void> {
    setBusy('disconnect')
    try {
      onStatusChange(await window.api.gcalDisconnect())
      toast.success('Google Calendar desconectado. A agenda "TickTask" continua no Google.')
    } finally {
      setBusy(null)
    }
  }

  const steps: SetupStep[] = [
    {
      id: 'projeto',
      title: 'Criar um projeto no Google Cloud',
      content: (
        <p>
          Em <OutLink href="https://console.cloud.google.com/projectcreate">Novo projeto</OutLink>,
          entre com a conta cuja agenda vai receber os eventos e crie um projeto (ex.:{' '}
          <code>TickTask</code>). Não precisa de faturamento.
        </p>
      )
    },
    {
      id: 'api',
      title: 'Ativar a Google Calendar API',
      content: (
        <p>
          Abra a{' '}
          <OutLink href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com">
            Google Calendar API
          </OutLink>{' '}
          com o projeto selecionado no topo e clique em <strong>Ativar</strong>.
        </p>
      )
    },
    {
      id: 'branding',
      title: 'Branding: nome e e-mail do app',
      content: (
        <>
          <p>
            Em <OutLink href="https://console.cloud.google.com/auth/branding">Branding</OutLink>,
            clique em <strong>Get started</strong>: nome <code>TickTask</code>, seu e-mail de
            suporte, público <strong>External</strong> e seu e-mail de contato.
          </p>
          <Callout tone="warn">
            Não envie logo: com logo, o Google passa a exigir a verificação do app.
          </Callout>
        </>
      )
    },
    {
      id: 'audience',
      title: 'Audience: publicar o app',
      content: (
        <>
          <p>
            Em <OutLink href="https://console.cloud.google.com/auth/audience">Audience</OutLink>,
            clique em <strong>Publish app</strong> para o status virar <em>In production</em>. Não
            envie para verificação.
          </p>
          <Callout tone="warn">
            Em <em>Testing</em> o Google derruba o acesso a cada 7 dias. Se não puder publicar,
            adicione seu e-mail em <em>Test users</em> e reconecte toda semana.
          </Callout>
        </>
      )
    },
    {
      id: 'client',
      title: 'Criar o client “Desktop app” e colar aqui',
      autoDone: credentialsSaved && !credentialsChanged,
      content: (
        <>
          <p>
            Em <OutLink href="https://console.cloud.google.com/auth/clients">Clients</OutLink>,
            clique em <strong>Create client</strong>, escolha <strong>Desktop app</strong> (não “Web
            application”) e copie o ID e a chave secreta.
          </p>
          <Callout tone="info">
            O Google mostra a chave secreta completa só nessa hora. Se perder, gere outra no próprio
            client.
          </Callout>
          <div className="grid gap-2 pt-1">
            <label className="text-xs font-medium text-slate-700">
              Client ID
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxxxxx.apps.googleusercontent.com"
                className="mt-1 bg-white border-slate-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Client Secret
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={status.hasClientSecret ? '•••••••• (salvo)' : 'GOCSPX-xxxxxxxx'}
                className="mt-1 bg-white border-slate-200"
              />
            </label>
          </div>
          {credentialsChanged && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={busy !== null || !canConnect}
            >
              {busy === 'save' && <Loader2 size={14} className="animate-spin" />}
              Salvar credenciais
            </Button>
          )}
        </>
      )
    },
    {
      id: 'conectar',
      title: 'Conectar',
      autoDone: status.connected && !credentialsChanged,
      content: (
        <>
          <p>
            O navegador abre no login do Google. Na tela “O Google não verificou este app”, clique
            em <strong>Avançado</strong> → <strong>Acessar TickTask</strong> e permita o acesso à
            agenda.
          </p>
          <Button
            onClick={handleConnect}
            disabled={busy !== null || !canConnect}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {busy === 'connect' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Conectar com o Google
          </Button>
        </>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={CalendarDays}
        title="Google Calendar"
        description="Blocos, datas agendadas e prazos das tarefas marcadas vão para a agenda “TickTask”."
        status={gcalStatusInfo(status)}
      />

      {status.connected ? (
        <>
          <ToggleRow
            title="Sincronização automática"
            description="Atualiza a agenda a cada mudança nas tarefas marcadas. Marque “Google Calendar” na seção Agenda de cada tarefa."
            checked={status.autoSync}
            onChange={async () =>
              onStatusChange(await window.api.gcalSetAutoSync(!status.autoSync))
            }
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleSyncAll} disabled={busy !== null}>
              {busy === 'sync' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Ressincronizar todas
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={busy !== null}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut size={16} />
              Desconectar
            </Button>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              {showGuide ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Ver guia de configuração e trocar credenciais
            </button>
            {showGuide && (
              <div className="mt-4">
                <SetupSteps storageKey="settings.gcal.steps" steps={steps} />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Siga os passos uma vez; leva uns 10 minutos. Os links abrem o Google Cloud no navegador.
          </p>
          <SetupSteps storageKey="settings.gcal.steps" steps={steps} />
        </>
      )}
    </div>
  )
}
