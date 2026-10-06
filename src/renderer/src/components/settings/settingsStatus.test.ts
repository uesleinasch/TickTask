import { describe, expect, it } from 'vitest'
import type { McpStatus } from '@shared/types'
import { errorMessage, gcalStatusInfo, mcpStatusInfo, notionStatus } from './settingsStatus'

const mcp = (overrides: Partial<McpStatus>): McpStatus =>
  ({ enabled: true, running: true, port: 7777, command: '', ...overrides }) as McpStatus

describe('estado das integrações', () => {
  it('Notion: conectado só com banco criado', () => {
    expect(notionStatus(null).label).toBe('Não configurado')
    expect(notionStatus({ apiKey: 'k', autoSync: false })).toEqual({
      tone: 'off',
      label: 'Incompleto'
    })
    expect(notionStatus({ apiKey: 'k', databaseId: 'd', autoSync: false }).tone).toBe('on')
  })

  it('Google: segue o connected', () => {
    expect(gcalStatusInfo(null).tone).toBe('off')
    expect(
      gcalStatusInfo({ clientId: 'c', hasClientSecret: true, connected: true, autoSync: true })
    ).toEqual({ tone: 'on', label: 'Conectado' })
  })

  it('MCP: ligado sem rodar é falha', () => {
    expect(mcpStatusInfo(mcp({ enabled: false })).label).toBe('Desligado')
    expect(mcpStatusInfo(mcp({})).tone).toBe('on')
    expect(mcpStatusInfo(mcp({ running: false })).tone).toBe('error')
  })
})

describe('errorMessage', () => {
  it('tira o prefixo que o Electron põe em erros de IPC', () => {
    const error = new Error("Error invoking remote method 'gcal:connect': Error: Tempo esgotado")
    expect(errorMessage(error)).toBe('Tempo esgotado')
    expect(errorMessage('x')).toBe('Erro desconhecido')
  })
})
