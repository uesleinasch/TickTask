export interface FrameSplit {
  frames: string[]
  rest: string
}

export function splitFrames(buffer: string): FrameSplit {
  const parts = buffer.split('\n')
  const rest = parts.pop() ?? ''
  const frames = parts.map((line) => line.trim()).filter((line) => line.length > 0)
  return { frames, rest }
}

export function frameId(frame: string): string | number | null {
  try {
    const parsed = JSON.parse(frame) as { id?: string | number }
    return parsed.id ?? null
  } catch {
    return null
  }
}

// O StreamableHTTPServerTransport responde JSON puro ou um stream SSE, conforme o Accept e o
// tipo da mensagem; em SSE a mensagem JSON-RPC vem nas linhas "data:" (concatenadas por \n).
export function extractPayload(contentType: string, body: string): string | null {
  const trimmed = body.trim()
  if (trimmed.length === 0) return null

  if (!contentType.includes('text/event-stream')) {
    return trimmed
  }

  const data = trimmed
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n')

  return data.length > 0 ? data : null
}

export function jsonRpcError(id: string | number | null, message: string): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code: -32000, message }
  })
}
