import { useEffect, useState } from 'react'
import { Loader2, LogOut, RefreshCw, Ticket } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { toast } from '@renderer/components/ui/sonner'
import {
  STATUS_LABELS,
  type JiraBoardSummary,
  type JiraStatus,
  type Project,
  type TaskStatus
} from '@shared/types'
import { SectionHeader, ToggleRow } from './SettingsPrimitives'
import { errorMessage, jiraStatusInfo } from './settingsStatus'

const LOCAL_STATUSES: TaskStatus[] = [
  'inbox',
  'proximas',
  'aguardando',
  'executando',
  'finalizada',
  'someday'
]

const CATEGORY_LABELS = { new: 'A fazer', indeterminate: 'Em andamento', done: 'Concluído' }

const AUTO_IMPORT_OPTIONS = [
  { value: 0, label: 'Desligado' },
  { value: 15, label: 'A cada 15 min' },
  { value: 30, label: 'A cada 30 min' },
  { value: 60, label: 'A cada hora' }
]

function ProjectSelect({
  value,
  projects,
  emptyLabel,
  onChange
}: {
  value: number | null
  projects: Project[]
  emptyLabel: string
  onChange: (projectId: number | null) => void
}): React.JSX.Element {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-8 max-w-[14rem] rounded-md border border-slate-200 bg-white px-2 text-sm"
    >
      <option value="">{emptyLabel}</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  )
}

interface BoardGroup {
  key: string | null
  name: string
  boards: JiraBoardSummary[]
}

function groupBoardsBySpace(boards: JiraBoardSummary[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>()
  for (const board of boards) {
    const name = board.spaceName ?? 'Sem espaço'
    const group = groups.get(name) ?? { key: board.spaceKey ?? null, name, boards: [] }
    group.boards.push(board)
    groups.set(name, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.key !== !b.key) return a.key ? -1 : 1
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

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
  const [busy, setBusy] = useState<'save' | 'boards' | 'import' | 'disconnect' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
  }, [])

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

  async function handleImport(): Promise<void> {
    setBusy('import')
    try {
      const result = await window.api.jiraImportNow()
      if (result) {
        toast.success(
          `Jira: ${result.created} novas, ${result.updated} atualizadas, ${result.unchanged} sem mudança.`
        )
      }
    } catch {
      /* o erro já aparece pelo evento jira:syncError */
    } finally {
      onStatusChange(await window.api.jiraGetStatus())
      setBusy(null)
    }
  }

  async function changeMapping(jiraStatus: string, local: string): Promise<void> {
    const mapping = { ...status.statusMapping }
    if (local) mapping[jiraStatus] = local as TaskStatus
    else delete mapping[jiraStatus]
    onStatusChange(await window.api.jiraSaveMapping(mapping))
  }

  async function changeSpaceProject(spaceKey: string, projectId: number | null): Promise<void> {
    const spaceProjects = { ...status.spaceProjects }
    if (projectId) spaceProjects[spaceKey] = projectId
    else delete spaceProjects[spaceKey]
    onStatusChange(await window.api.jiraSaveOptions({ spaceProjects }))
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
        description="Carrega as issues atribuídas a você dos boards escolhidos como tasks. O status do Jira fica separado do status da task e muda pelo seletor no card."
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
              <div className="grid gap-4">
                {groupBoardsBySpace(status.boards).map((group) => (
                  <div key={group.name} className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.name}
                      {group.key && (
                        <span className="ml-1.5 font-mono font-normal normal-case text-slate-400">
                          {group.key}
                        </span>
                      )}
                    </h4>
                    <ul className="grid gap-1.5">
                      {group.boards.map((board) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-slate-800">Importar issues</h3>
                <p className="text-xs text-slate-500">
                  {status.lastImportAt
                    ? `Última tentativa: ${new Date(status.lastImportAt).toLocaleString('pt-BR')}`
                    : 'Ainda não importado.'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleImport}
                disabled={busy !== null || status.boardIds.length === 0}
              >
                {busy === 'import' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Importar agora
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-800">Projeto por espaço</h3>
            <p className="text-xs text-slate-500">
              Tasks novas vão para o projeto do seu espaço; sem escolha, para o projeto padrão. Na
              importação, task já vinculada e sem projeto também recebe o projeto do espaço.
            </p>
            <ul className="grid gap-2">
              <li className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span className="font-medium">Projeto padrão</span>
                <ProjectSelect
                  value={status.projectId}
                  projects={projects}
                  emptyLabel="Sem projeto"
                  onChange={async (projectId) =>
                    onStatusChange(await window.api.jiraSaveOptions({ projectId }))
                  }
                />
              </li>
              {status.knownSpaces.map((space) => (
                <li
                  key={space.key}
                  className="flex items-center justify-between gap-3 text-sm text-slate-700"
                >
                  <span className="min-w-0 truncate">
                    {space.name}{' '}
                    <span className="font-mono text-xs text-slate-400">{space.key}</span>
                  </span>
                  <ProjectSelect
                    value={status.spaceProjects[space.key] ?? null}
                    projects={projects}
                    emptyLabel="Projeto padrão"
                    onChange={(projectId) => changeSpaceProject(space.key, projectId)}
                  />
                </li>
              ))}
            </ul>
            {status.knownSpaces.length === 0 && (
              <p className="text-xs text-slate-400">
                Os espaços aparecem aqui ao marcar boards ou depois da primeira importação.
              </p>
            )}
          </div>

          {status.knownStatuses.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-800">Status inicial das tasks novas</h3>
              <p className="text-xs text-slate-500">
                Vale só quando a importação cria a task. Depois disso o status da task e o status do
                Jira andam separados. Sem escolha, segue a categoria do Jira.
              </p>
              <ul className="grid gap-2">
                {status.knownStatuses.map((known) => (
                  <li
                    key={known.name}
                    className="flex items-center justify-between gap-3 text-sm text-slate-700"
                  >
                    <span className="min-w-0 truncate">
                      {known.name}{' '}
                      <span className="text-xs text-slate-400">
                        ({CATEGORY_LABELS[known.category]})
                      </span>
                    </span>
                    <select
                      value={status.statusMapping[known.name] ?? ''}
                      onChange={(e) => changeMapping(known.name, e.target.value)}
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    >
                      <option value="">Padrão da categoria</option>
                      {LOCAL_STATUSES.map((local) => (
                        <option key={local} value={local}>
                          {STATUS_LABELS[local]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-slate-200">
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
