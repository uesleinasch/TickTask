import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createConfirmStore } from './confirmGuard'
import { ok } from './reply'
import { readMcpConfig } from './store'
import { registerTaskTools } from './tools/tasks'

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'ticktask', version: '1.0.0' })
  const ctx = {
    confirmStore: createConfirmStore(),
    bulkThreshold: readMcpConfig().bulkThreshold
  }

  server.registerTool(
    'server_info',
    {
      title: 'Informações do servidor',
      description: 'Confirma que o TickTask está aberto e respondendo.'
    },
    async () => ok({ app: 'TickTask', status: 'ok' })
  )

  registerTaskTools(server, ctx)

  return server
}
