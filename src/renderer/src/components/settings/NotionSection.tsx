import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Database,
  Link2,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/sonner'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { SetupSteps, type SetupStep } from './SetupSteps'
import { Callout, OutLink, SectionHeader, ToggleRow } from './SettingsPrimitives'
import { errorMessage, notionStatus, type NotionConfig } from './settingsStatus'

export function NotionSection({
  config,
  onConfigChange
}: {
  config: NotionConfig | null
  onConfigChange: (config: NotionConfig | null) => void
}): React.JSX.Element {
  const [apiKey, setApiKey] = useState(config?.apiKey ?? '')
  const [pageId, setPageId] = useState(config?.pageId ?? '')
  const [busy, setBusy] = useState<'test' | 'database' | 'sync' | null>(null)
  const [tested, setTested] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const draft: NotionConfig = {
    ...config,
    apiKey: apiKey.trim(),
    pageId: pageId.trim() || undefined,
    autoSync: config?.autoSync ?? false
  }
  const apiKeyChanged = apiKey.trim() !== (config?.apiKey ?? '')

  async function reload(): Promise<void> {
    onConfigChange(await window.api.notionGetConfig())
  }

  async function handleTest(): Promise<void> {
    setBusy('test')
    try {
      await window.api.notionSaveConfig(draft)
      await reload()
      const result = await window.api.notionTestConnection()
      setTested(result.success)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      setTested(false)
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateDatabase(): Promise<void> {
    setBusy('database')
    try {
      await window.api.notionSaveConfig(draft)
      await window.api.notionCreateDatabase()
      await reload()
      setShowGuide(false)
      toast.success('Banco de dados GTD APP criado com sucesso!')
    } catch (error) {
      toast.error(`Erro ao criar banco: ${errorMessage(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleSyncAll(): Promise<void> {
    setBusy('sync')
    try {
      const result = await window.api.notionSyncAllTasks()
      toast.success(`Sincronização concluída: ${result.success} sucesso, ${result.failed} falhas`)
      await reload()
    } catch (error) {
      toast.error(`Erro na sincronização: ${errorMessage(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleAutoSync(): Promise<void> {
    if (!config) return
    const next = { ...config, autoSync: !config.autoSync }
    await window.api.notionSaveConfig(next)
    onConfigChange(next)
  }

  async function handleClear(): Promise<void> {
    try {
      await window.api.notionClearConfig()
      setApiKey('')
      setPageId('')
      setTested(false)
      onConfigChange(null)
      toast.success('Configurações do Notion removidas')
    } catch {
      toast.error('Erro ao limpar configurações')
    }
  }

  const steps: SetupStep[] = [
    {
      id: 'integracao',
      title: 'Criar a integração no Notion',
      content: (
        <p>
          Em{' '}
          <OutLink href="https://www.notion.so/my-integrations">notion.so/my-integrations</OutLink>,
          crie uma integração <strong>Internal</strong> e copie o{' '}
          <em>Internal Integration Secret</em>.
        </p>
      )
    },
    {
      id: 'apikey',
      title: 'Colar a API Key e testar',
      autoDone: !!config?.apiKey && !apiKeyChanged && (tested || !!config.databaseId),
      content: (
        <>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setTested(false)
            }}
            placeholder="ntn_xxxxxxxxxxxx"
            className="bg-white border-slate-200"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={busy !== null || !apiKey.trim()}
          >
            {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Testar conexão
          </Button>
        </>
      )
    },
    {
      id: 'pagina',
      title: 'Conectar a integração a uma página',
      content: (
        <>
          <p>
            No Notion, abra a página onde o banco deve ficar, clique em <strong>⋯</strong> (canto
            superior direito) → <strong>Conexões</strong> → <strong>Adicionar conexões</strong> e
            escolha a sua integração.
          </p>
          <Callout tone="warn">
            A integração só enxerga páginas conectadas a ela. Erros de “página não encontrada” vêm
            daqui.
          </Callout>
        </>
      )
    },
    {
      id: 'banco',
      title: 'Criar o banco GTD APP',
      autoDone: !!config?.databaseId,
      content: (
        <>
          <label className="block text-xs font-medium text-slate-700">
            Page ID (opcional)
            <Input
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 bg-white border-slate-200"
            />
          </label>
          <p className="text-xs text-slate-500">
            Em branco, o banco é criado na primeira página conectada à integração.
          </p>
          <Button
            onClick={handleCreateDatabase}
            disabled={busy !== null || !apiKey.trim()}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {busy === 'database' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Database size={16} />
            )}
            Criar banco GTD APP
          </Button>
        </>
      )
    }
  ]

  const status = notionStatus(config)

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BookOpen}
        title="Notion"
        description="Sincronize suas tarefas com o banco de dados GTD APP no Notion."
        status={status}
      />

      {config?.databaseId ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Database size={14} />
              Banco GTD APP <code>{config.databaseId.substring(0, 8)}…</code>
            </span>
            {config.lastSync && (
              <span>Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}</span>
            )}
          </div>
          <ToggleRow
            title="Sincronização automática"
            description="Sincroniza ao criar, editar ou excluir tarefas."
            checked={config.autoSync}
            onChange={handleToggleAutoSync}
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleSyncAll} disabled={busy !== null}>
              {busy === 'sync' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Sincronizar todas as tarefas
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 size={16} />
              Limpar configurações
            </Button>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              {showGuide ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Ver guia de configuração e trocar a API Key
            </button>
            {showGuide && (
              <div className="mt-4">
                <SetupSteps storageKey="settings.notion.steps" steps={steps} />
              </div>
            )}
          </div>
        </>
      ) : (
        <SetupSteps storageKey="settings.notion.steps" steps={steps} />
      )}

      <DeleteConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        onConfirm={handleClear}
        title="Limpar a configuração do Notion?"
        description="A API Key e o vínculo com o banco GTD APP serão removidos do TickTask. Nada é apagado no Notion."
        confirmLabel="Limpar"
      />
    </div>
  )
}
