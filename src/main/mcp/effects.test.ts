import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'

async function loadEffects(): Promise<typeof import('./effects')> {
  vi.resetModules()
  return import('./effects')
}

describe('efeitos de escrita (MCP)', () => {
  it('não lança e avisa quando registerWriteEffects ainda não foi chamado', async () => {
    const { afterTaskWrite, broadcastRefresh } = await loadEffects()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => broadcastRefresh()).not.toThrow()
    expect(() => afterTaskWrite(7)).not.toThrow()

    expect(warnSpy).toHaveBeenCalledTimes(2)
    for (const call of warnSpy.mock.calls) {
      expect(String(call[0])).toContain('registerWriteEffects')
    }

    warnSpy.mockRestore()
  })

  it('afterTaskWrite dispara autoSync e o refresh, nessa ordem, sem esperar o autoSync', async () => {
    const { registerWriteEffects, afterTaskWrite } = await loadEffects()
    const calls: string[] = []
    const send = vi.fn(() => {
      calls.push('refresh')
    })
    const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow
    const autoSync = vi.fn((id: number) => {
      calls.push(`autoSync:${id}`)
      return Promise.reject(new Error('falha simulada em autoSync')).catch(() => undefined)
    })

    registerWriteEffects({ getMainWindow: () => window, autoSync })
    afterTaskWrite(42)

    expect(autoSync).toHaveBeenCalledWith(42)
    expect(send).toHaveBeenCalledWith('tasks:refresh')
    expect(calls).toEqual(['autoSync:42', 'refresh'])
  })

  it('não envia refresh quando a janela principal está destruída ou ausente', async () => {
    const { registerWriteEffects, broadcastRefresh } = await loadEffects()
    const send = vi.fn()
    const destroyedWindow = {
      isDestroyed: () => true,
      webContents: { send }
    } as unknown as BrowserWindow

    registerWriteEffects({ getMainWindow: () => destroyedWindow, autoSync: vi.fn() })
    broadcastRefresh()
    expect(send).not.toHaveBeenCalled()

    registerWriteEffects({ getMainWindow: () => null, autoSync: vi.fn() })
    expect(() => broadcastRefresh()).not.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
})
