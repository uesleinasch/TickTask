import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ok } from './reply'

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'ticktask', version: '1.0.0' })

  server.registerTool(
    'server_info',
    {
      title: 'Informações do servidor',
      description: 'Confirma que o TickTask está aberto e respondendo.'
    },
    async () => ok({ app: 'TickTask', status: 'ok' })
  )

  return server
}
