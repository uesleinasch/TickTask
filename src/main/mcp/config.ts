import { randomBytes } from 'crypto'

export interface McpConfig {
  enabled: boolean
  port: number
  token: string
  bulkThreshold: number
}

export const DEFAULT_PORT = 39237
export const DEFAULT_BULK_THRESHOLD = 5

const MIN_PORT = 1024
const MAX_PORT = 65535

export function generateToken(random: (size: number) => Buffer = randomBytes): string {
  return random(32).toString('hex')
}

function isUsablePort(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= MIN_PORT && value <= MAX_PORT
  )
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function normalizeConfig(raw: unknown, makeToken: () => string = generateToken): McpConfig {
  const source = (raw ?? {}) as Partial<McpConfig>

  return {
    enabled: source.enabled === true,
    port: isUsablePort(source.port) ? source.port : DEFAULT_PORT,
    token: typeof source.token === 'string' && source.token.length > 0 ? source.token : makeToken(),
    bulkThreshold: isPositiveInteger(source.bulkThreshold)
      ? source.bulkThreshold
      : DEFAULT_BULK_THRESHOLD
  }
}
