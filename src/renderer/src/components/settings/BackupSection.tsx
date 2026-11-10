import { useEffect, useState } from 'react'
import { DatabaseBackup, FolderOpen, Loader2, RotateCcw, Save } from 'lucide-react'
import type { BackupCounts, BackupSnapshot, BackupStatus } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { toast } from '@renderer/components/ui/sonner'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { Callout, SectionHeader } from './SettingsPrimitives'
import { errorMessage } from './settingsStatus'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function describeCounts(counts: BackupCounts): string {
  const part = (value: number | null, label: string): string => `${value ?? '?'} ${label}`
  return [
    part(counts.tasks, 'tasks'),
    part(counts.projects, 'projetos'),
    part(counts.timeEntries, 'registros de tempo')
  ].join(' · ')
}

export function BackupSection(): React.JSX.Element {
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)
  const [pending, setPending] = useState<BackupSnapshot | null>(null)

  useEffect(() => {
    window.api
      .backupGetStatus()
      .then(setStatus)
      .catch((error) => toast.error(errorMessage(error)))
  }, [])

  async function chooseFolder(): Promise<void> {
    try {
      const next = await window.api.backupChooseFolder()
      if (next) setStatus(next)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function backupNow(): Promise<void> {
    setBusy('backup')
    try {
      const snapshot = await window.api.backupCreate()
      setStatus(await window.api.backupGetStatus())
      toast.success(`Backup criado: ${describeCounts(snapshot.counts)}.`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function askRestore(dir: string): Promise<void> {
    try {
      setPending(await window.api.backupInspect(dir))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function restoreFromOtherFolder(): Promise<void> {
    const dir = await window.api.backupChooseSnapshot()
    if (dir) await askRestore(dir)
  }

  async function confirmRestore(): Promise<void> {
    if (!pending) return
    setBusy('restore')
    try {
      await window.api.backupRestore(pending.path)
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(null)
    }
  }

  const disabled = busy !== null
  const snapshots = status?.snapshots ?? []

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={DatabaseBackup}
        title="Backup"
        description="Cópia dos dados locais para restaurar depois de formatar ou em outro computador."
      />

      <div className="p-4 rounded-sm border border-slate-200 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">Pasta de backup</p>
          <p className="text-xs text-slate-500 mt-1 truncate" title={status?.folder ?? undefined}>
            {status?.folder ?? 'Nenhuma pasta escolhida. Prefira um HD externo ou pasta na nuvem.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={chooseFolder} disabled={disabled}>
          <FolderOpen size={14} className="mr-1.5" />
          {status?.folder ? 'Trocar' : 'Escolher pasta'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={backupNow} disabled={disabled || !status?.folder}>
          {busy === 'backup' ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={14} className="mr-1.5" />
          )}
          Fazer backup agora
        </Button>
        <Button variant="outline" onClick={restoreFromOtherFolder} disabled={disabled}>
          <RotateCcw size={14} className="mr-1.5" />
          Restaurar de outra pasta…
        </Button>
      </div>

      {status?.folder && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Backups nesta pasta
          </p>
          {snapshots.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum backup ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-sm">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.path}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(snapshot.createdAt)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {describeCounts(snapshot.counts)} · {formatSize(snapshot.sizeBytes)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => askRestore(snapshot.path)}
                    disabled={disabled}
                  >
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {busy === 'restore' && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Restaurando… o TickTask vai reiniciar.
        </p>
      )}

      <div>
        <Callout tone="info">
          O backup leva o banco (tasks, projetos, tempos, notas e desenhos), as imagens das notas e
          as configurações do Notion e do servidor MCP. A conexão com o Google Calendar não vai
          junto: depois de restaurar em outro computador, reconecte na seção Google Calendar.
        </Callout>
        <Callout tone="warn">
          O backup contém a API Key do Notion e o token do MCP. Guarde a pasta em local seguro.
        </Callout>
      </div>

      <DeleteConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        onConfirm={() => void confirmRestore()}
        title="Restaurar este backup?"
        description={
          pending
            ? `Backup de ${formatDate(pending.createdAt)}: ${describeCounts(pending.counts)}. Os dados atuais serão substituídos (uma cópia fica em uma pasta pre-restore dentro da pasta de dados do app) e o TickTask vai reiniciar.`
            : ''
        }
        confirmLabel="Restaurar e reiniciar"
      />
    </div>
  )
}
