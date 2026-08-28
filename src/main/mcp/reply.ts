import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export type ErrorCode =
  | 'not_found'
  | 'ambiguous'
  | 'needs_confirmation'
  | 'invalid_token'
  | 'validation'
  | 'app_state'

export function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

export function okImage(base64: string, mimeType: string, data?: unknown): CallToolResult {
  const content: CallToolResult['content'] = [{ type: 'image' as const, data: base64, mimeType }]
  if (data !== undefined) {
    content.push({ type: 'text' as const, text: JSON.stringify(data) })
  }
  return { content }
}

export function fail(
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>
): CallToolResult {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: JSON.stringify({ ...extra, code, message }) }]
  }
}
