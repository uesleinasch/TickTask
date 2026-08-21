import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { normalizeConfig, type McpConfig } from './config'

function configPath(): string {
  return path.join(app.getPath('userData'), 'mcp-config.json')
}

export function readMcpConfig(): McpConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf-8'))
    return normalizeConfig(raw)
  } catch {
    const fresh = normalizeConfig(undefined)
    writeRaw(fresh)
    return fresh
  }
}

function writeRaw(config: McpConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export function writeMcpConfig(patch: Partial<McpConfig>): McpConfig {
  const next = normalizeConfig({ ...readMcpConfig(), ...patch })
  writeRaw(next)
  return next
}
