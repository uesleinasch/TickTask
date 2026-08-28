import { describe, expect, it } from 'vitest'
import { fail, ok } from './reply'

describe('ok', () => {
  it('serializa o payload como texto', () => {
    expect(ok({ a: 1 })).toEqual({ content: [{ type: 'text', text: '{"a":1}' }] })
  })
})

describe('fail', () => {
  it('marca isError e inclui código e mensagem', () => {
    const result = fail('not_found', 'Projeto não encontrado.')
    expect(result.isError).toBe(true)
    const [content] = result.content
    if (content.type !== 'text') throw new Error('esperava conteúdo de texto')
    expect(JSON.parse(content.text)).toEqual({
      code: 'not_found',
      message: 'Projeto não encontrado.'
    })
  })

  it('mescla os campos extras', () => {
    const result = fail('ambiguous', 'Nome ambíguo.', { candidates: ['a', 'b'] })
    const [content] = result.content
    if (content.type !== 'text') throw new Error('esperava conteúdo de texto')
    expect(JSON.parse(content.text).candidates).toEqual(['a', 'b'])
  })

  it('não deixa extra sobrescrever code nem message', () => {
    const result = fail('not_found', 'Projeto não encontrado.', {
      code: 'app_state',
      message: 'mensagem forjada'
    })
    const [content] = result.content
    if (content.type !== 'text') throw new Error('esperava conteúdo de texto')
    expect(JSON.parse(content.text)).toEqual({
      code: 'not_found',
      message: 'Projeto não encontrado.'
    })
  })
})
