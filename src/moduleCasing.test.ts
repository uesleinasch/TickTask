import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Windows e macOS resolvem imports sem diferenciar maiúsculas: './SetupSteps' acha 'setupSteps.ts'
// antes de 'SetupSteps.tsx' e o build de release quebra só nesses sistemas.
const SOURCE_EXTENSION = /\.(ts|tsx|js|jsx)$/

function listModules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listModules(path)
    return SOURCE_EXTENSION.test(entry.name) ? [path] : []
  })
}

describe('nomes de módulo', () => {
  it('nenhum par de módulos difere só em maiúsculas/minúsculas', () => {
    const root = join(__dirname)
    const byKey = new Map<string, Set<string>>()
    for (const file of listModules(root)) {
      const modulePath = relative(root, file).replace(SOURCE_EXTENSION, '')
      const key = modulePath.toLowerCase()
      byKey.set(key, (byKey.get(key) ?? new Set()).add(modulePath))
    }
    const clashes = [...byKey.values()].filter((names) => names.size > 1).map((names) => [...names])
    expect(clashes).toEqual([])
  })
})
