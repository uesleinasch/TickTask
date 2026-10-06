import type { GcalStatus, McpStatus } from '@shared/types'

export type StatusTone = 'on' | 'off' | 'error'

export interface StatusInfo {
  tone: StatusTone
  label: string
}

export interface NotionConfig {
  apiKey: string
  pageId?: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

export function notionStatus(config: NotionConfig | null): StatusInfo {
  if (config?.databaseId) return { tone: 'on', label: 'Conectado' }
  if (config?.apiKey) return { tone: 'off', label: 'Incompleto' }
  return { tone: 'off', label: 'Não configurado' }
}

export function gcalStatusInfo(status: GcalStatus | null): StatusInfo {
  return status?.connected
    ? { tone: 'on', label: 'Conectado' }
    : { tone: 'off', label: 'Não conectado' }
}

export function mcpStatusInfo(status: McpStatus | null): StatusInfo {
  if (!status?.enabled) return { tone: 'off', label: 'Desligado' }
  return status.running ? { tone: 'on', label: 'Rodando' } : { tone: 'error', label: 'Falha' }
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Erro desconhecido'
  return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
