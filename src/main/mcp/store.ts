import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { normalizeConfig, type McpConfig } from './config'

function configPath(): string {
  return path.join(app.getPath('userData'), 'mcp-config.json')
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

export function readMcpConfig(): McpConfig {
  const target = configPath()
  try {
    const raw = JSON.parse(fs.readFileSync(target, 'utf-8'))
    return normalizeConfig(raw)
  } catch (error) {
    if (isMissingFileError(error)) {
      const fresh = normalizeConfig(undefined)
      writeRaw(fresh)
      return fresh
    }

    console.error('[mcp] mcp-config.json corrompido, isolando arquivo original:', error)
    fs.renameSync(target, `${target}.corrupt-${Date.now()}`)
    const fresh = normalizeConfig(undefined)
    writeRaw(fresh)
    return fresh
  }
}

function writeRaw(config: McpConfig): void {
  const target = configPath()
  // mode só é aplicado por writeFileSync na criação do arquivo; o chmod garante
  // 0600 também quando o arquivo já existia com permissão aberta.
  fs.writeFileSync(target, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 })
  fs.chmodSync(target, 0o600)
}

export function writeMcpConfig(patch: Partial<McpConfig>): McpConfig {
  const next = normalizeConfig({ ...readMcpConfig(), ...patch })
  writeRaw(next)
  return next
}
