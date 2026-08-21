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
      return persistFreshConfig()
    }

    console.error('[mcp] mcp-config.json corrompido, isolando arquivo original:', error)
    // Preservar o arquivo corrompido é desejável, mas nunca pode impedir o boot do
    // app: se o rename falhar (permissão, disco cheio), seguimos e sobrescrevemos.
    try {
      fs.renameSync(target, `${target}.corrupt-${Date.now()}`)
    } catch (renameError) {
      console.error('[mcp] não foi possível isolar o arquivo corrompido:', renameError)
    }
    return persistFreshConfig()
  }
}

function persistFreshConfig(): McpConfig {
  const fresh = normalizeConfig(undefined)
  // Ler a config no boot nunca pode impedir o app de abrir: se não der para gravar
  // (disco cheio, permissão), seguimos com a config default só em memória.
  try {
    writeRaw(fresh)
  } catch (error) {
    console.error('[mcp] não foi possível gravar a configuração nova, seguindo em memória:', error)
  }
  return fresh
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
