import path from 'path'
import { describe, expect, it } from 'vitest'
import { resolveUserDataOverride } from './devUserData'

const appData = path.join('/home', 'u', '.config')

describe('resolveUserDataOverride', () => {
  it('app empacotado usa a pasta padrão', () => {
    expect(resolveUserDataOverride({ isPackaged: true, env: {}, appData })).toBeNull()
  })

  it('dev usa uma pasta própria', () => {
    expect(resolveUserDataOverride({ isPackaged: false, env: {}, appData })).toBe(
      path.join(appData, 'ticktask-dev')
    )
  })

  it('TICKTASK_USER_DATA vence nos dois casos; vazio é ignorado', () => {
    const env = { TICKTASK_USER_DATA: ' /tmp/tt ' }
    expect(resolveUserDataOverride({ isPackaged: true, env, appData })).toBe(
      path.resolve('/tmp/tt')
    )
    expect(resolveUserDataOverride({ isPackaged: false, env, appData })).toBe(
      path.resolve('/tmp/tt')
    )
    expect(
      resolveUserDataOverride({ isPackaged: false, env: { TICKTASK_USER_DATA: '  ' }, appData })
    ).toBe(path.join(appData, 'ticktask-dev'))
  })
})
