import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}
