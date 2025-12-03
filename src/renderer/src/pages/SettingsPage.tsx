import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  ArrowLeft,
  Settings,
  Link2,
  Database,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

interface NotionConfig {
  apiKey: string
  pageId?: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [config, setConfig] = useState<NotionConfig>({
    apiKey: '',
    autoSync: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCreatingDb, setIsCreatingDb] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [hasChanges, setHasChanges] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Carregar configuração salva
  useEffect(() => {
    async function loadConfig(): Promise<void> {
      try {
        const savedConfig = await window.api.notionGetConfig()
        if (savedConfig) {
          setConfig(savedConfig)
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleInputChange = useCallback(
    (field: keyof NotionConfig, value: string | boolean): void => {
      setConfig((prev) => ({ ...prev, [field]: value }))
      setHasChanges(true)
      setConnectionStatus('idle')
    },
    []
  )

  const handleSaveConfig = useCallback(async (): Promise<void> => {
    try {
      await window.api.notionSaveConfig(config)
      setHasChanges(false)
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configurações')
    }
  }, [config])

  const handleTestConnection = useCallback(async (): Promise<void> => {
    if (!config.apiKey) {
      toast.error('Preencha a API Key')
      return
    }

    setIsTesting(true)
    try {
      // Salvar antes de testar
      await window.api.notionSaveConfig(config)
      setHasChanges(false)

      const result = await window.api.notionTestConnection()
      if (result.success) {
        setConnectionStatus('success')
        toast.success(result.message)
      } else {
        setConnectionStatus('error')
        toast.error(result.message)
      }
    } catch (error) {
      setConnectionStatus('error')
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro: ${message}`)
    } finally {
      setIsTesting(false)
    }
  }, [config])

  const handleCreateDatabase = useCallback(async (): Promise<void> => {
    if (!config.apiKey) {
      toast.error('Configure a API Key primeiro')
      return
    }

    setIsCreatingDb(true)
    try {
      // Salvar configuração primeiro
      await window.api.notionSaveConfig(config)
      setHasChanges(false)

      const databaseId = await window.api.notionCreateDatabase()

      // Recarregar config completa após criação
      const updatedConfig = await window.api.notionGetConfig()
      if (updatedConfig) {
        setConfig(updatedConfig)
      } else {
        setConfig((prev) => ({ ...prev, databaseId }))
      }

      toast.success('Banco de dados GTD APP criado com sucesso!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao criar banco: ${message}`)
    } finally {
      setIsCreatingDb(false)
    }
  }, [config])

  const handleSyncAllTasks = useCallback(async (): Promise<void> => {
    if (!config.databaseId) {
      toast.error('Crie o banco de dados primeiro')
      return
    }

    setIsSyncing(true)
    try {
      const result = await window.api.notionSyncAllTasks()
      toast.success(`Sincronização concluída: ${result.success} sucesso, ${result.failed} falhas`)

      // Atualizar lastSync
      const updatedConfig = await window.api.notionGetConfig()
      if (updatedConfig) {
        setConfig(updatedConfig)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro na sincronização: ${message}`)
    } finally {
      setIsSyncing(false)
    }
  }, [config.databaseId])

  const handleClearConfig = useCallback(async (): Promise<void> => {
    try {
      await window.api.notionClearConfig()
      setConfig({
        apiKey: '',
        autoSync: false
      })
      setConnectionStatus('idle')
      setHasChanges(false)
      toast.success('Configurações removidas')
    } catch {
      toast.error('Erro ao limpar configurações')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
        >
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900">Configurações</h1>
        </div>
        <div className="w-20" />
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Notion Integration Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.373.466l1.822 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.047.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.746c.093.42 0 .84-.42.887l-.7.14v10.264c-.606.327-1.167.514-1.634.514-.747 0-.933-.234-1.494-.933l-4.577-7.186v6.952l1.447.327s0 .84-1.167.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.027.746-1.074l3.454-.233 4.763 7.279V9.387l-1.213-.14c-.094-.514.28-.886.746-.933l3.22-.186zm-14.29-6.66L18.54 .381c1.4-.093 1.773.42 2.52 1.4l3.453 4.856c.56.84.326 1.167-.56 1.26l-15.27.933V8.174l-.793-1.073-.327-4.41c0-.747.467-1.213 1.073-1.213.373 0 .653.14.84.373z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Integração com Notion</h2>
                <p className="text-sm text-slate-500">
                  Sincronize suas tarefas com o banco de dados GTD APP no Notion
                </p>
              </div>
            </div>

            {/* Status da Conexão */}
            {connectionStatus !== 'idle' && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  connectionStatus === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {connectionStatus === 'success' ? (
                  <>
                    <Check size={16} />
                    <span>Conectado ao Notion com sucesso!</span>
                  </>
                ) : (
                  <>
                    <X size={16} />
                    <span>Falha na conexão. Verifique suas credenciais.</span>
                  </>
                )}
              </div>
            )}

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">API Key do Notion</label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="ntn_xxxxxxxxxxxx"
                className="bg-slate-50 border-slate-200"
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <AlertCircle size={12} />
                Crie uma integração em{' '}
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  notion.so/my-integrations
                  <ExternalLink size={10} />
                </a>
              </p>
            </div>

            {/* Database ID (se já criado) */}
            {config.databaseId && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Database size={16} />
                  <span>Banco de dados GTD APP configurado:</span>
                  <code className="bg-emerald-100 px-2 py-0.5 rounded text-xs">
                    {config.databaseId.substring(0, 8)}...
                  </code>
                </div>
              </div>
            )}

            {/* Page ID (se detectado) */}
            {config.pageId && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-emerald-500" />
                  <span>Página TickTask:</span>
                  <code className="bg-slate-200 px-2 py-0.5 rounded text-xs">
                    {config.pageId.substring(0, 8)}...
                  </code>
                </div>
              </div>
            )}

            {/* Last Sync */}
            {config.lastSync && (
              <div className="text-xs text-slate-500">
                Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}
              </div>
            )}

            {/* Auto Sync Toggle */}
            {config.databaseId && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Sincronização Automática
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sincroniza automaticamente ao criar, editar ou excluir tarefas
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !config.autoSync
                    handleInputChange('autoSync', newValue)
                    // Salvar imediatamente
                    window.api.notionSaveConfig({ ...config, autoSync: newValue })
                    toast.success(
                      newValue
                        ? 'Sincronização automática ativada!'
                        : 'Sincronização automática desativada'
                    )
                    setHasChanges(false)
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.autoSync ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.autoSync ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !config.apiKey}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Testar Conexão
              </Button>

              {!config.databaseId && (
                <Button
                  onClick={handleCreateDatabase}
                  disabled={isCreatingDb || !config.apiKey}
                  className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isCreatingDb ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Database size={16} />
                  )}
                  Criar Banco GTD APP
                </Button>
              )}

              {config.databaseId && (
                <Button
                  onClick={handleSyncAllTasks}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isSyncing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Sincronizar Todas as Tarefas
                </Button>
              )}
            </div>

            {/* Advanced Settings (collapsible) */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Configurações Avançadas
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  {/* Page ID (opcional) */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Page ID (opcional)
                    </label>
                    <Input
                      type="text"
                      value={config.pageId || ''}
                      onChange={(e) => handleInputChange('pageId', e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="bg-slate-50 border-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                      Se não informado, uma página &ldquo;TickTask&rdquo; será criada
                      automaticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Save / Clear */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <Button
                onClick={handleClearConfig}
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Limpar Configurações
              </Button>

              {hasChanges && (
                <Button
                  onClick={handleSaveConfig}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Salvar Alterações
                </Button>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Como configurar a integração:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Acesse{' '}
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  notion.so/my-integrations
                </a>{' '}
                e crie uma nova integração
              </li>
              <li>Copie a &ldquo;Internal Integration Secret&rdquo; (API Key)</li>
              <li>
                <strong className="text-blue-900">IMPORTANTE:</strong> No Notion, abra uma página
                existente e conecte a integração:
                <ul className="list-disc ml-6 mt-1">
                  <li>Clique no menu ⋯ (três pontos) no canto superior direito</li>
                  <li>Selecione &ldquo;Conexões&rdquo; → &ldquo;Adicionar conexões&rdquo;</li>
                  <li>Escolha sua integração na lista</li>
                </ul>
              </li>
              <li>Cole a API Key aqui e clique em &ldquo;Criar Banco GTD APP&rdquo;</li>
              <li>O banco de dados será criado dentro da página que você conectou!</li>
            </ol>
          </div>

          {/* Warning Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <h4 className="font-semibold mb-2">⚠️ Atenção</h4>
            <p>
              A integração só pode acessar páginas que foram explicitamente conectadas a ela. Se
              você receber erros de &ldquo;página não encontrada&rdquo;, certifique-se de ter
              conectado a integração a pelo menos uma página no Notion.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
