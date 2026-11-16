import { describe, expect, it } from 'vitest'
import { isShiftEnter, terminalShortcut } from './terminalKeys'

const key = (over: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    code: '',
    key: '',
    ...over
  }) as KeyboardEvent

describe('isShiftEnter', () => {
  it('reconhece Shift+Enter', () => {
    expect(isShiftEnter(key({ key: 'Enter', shiftKey: true }))).toBe(true)
  })

  it('ignora Enter sem Shift e Shift+Enter com outro modificador', () => {
    expect(isShiftEnter(key({ key: 'Enter' }))).toBe(false)
    expect(isShiftEnter(key({ key: 'Enter', shiftKey: true, ctrlKey: true }))).toBe(false)
    expect(isShiftEnter(key({ key: 'Enter', shiftKey: true, altKey: true }))).toBe(false)
  })
})

describe('terminalShortcut', () => {
  it('Ctrl + tecla à esquerda do 1 alterna; com Shift maximiza', () => {
    expect(terminalShortcut(key({ ctrlKey: true, code: 'Backquote' }))).toBe('toggle')
    expect(terminalShortcut(key({ ctrlKey: true, shiftKey: true, code: 'Backquote' }))).toBe(
      'maximize'
    )
    expect(terminalShortcut(key({ code: 'Backquote' }))).toBeNull()
  })
})
