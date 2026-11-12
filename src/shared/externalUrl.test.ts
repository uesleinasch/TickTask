import { describe, expect, it } from 'vitest'
import { isSafeHttpUrl } from './externalUrl'

describe('isSafeHttpUrl', () => {
  it('aceita http e https', () => {
    expect(isSafeHttpUrl('https://jacto.atlassian.net/browse/ABC-1')).toBe(true)
    expect(isSafeHttpUrl('http://exemplo.com')).toBe(true)
  })

  it('recusa outros esquemas e texto que não é URL', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeHttpUrl('ticktask-asset://x')).toBe(false)
    expect(isSafeHttpUrl('jacto.atlassian.net')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
})
