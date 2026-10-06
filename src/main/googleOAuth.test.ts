import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  GoogleAuthRevokedError,
  GCAL_SCOPE,
  buildAuthUrl,
  createPkcePair,
  exchangeCode,
  refreshAccessToken
} from './googleOAuth'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

const client = { clientId: 'cid.apps.googleusercontent.com', clientSecret: 'shh' }

describe('createPkcePair', () => {
  it('gera challenge S256 base64url do verifier', () => {
    const { verifier, challenge } = createPkcePair()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/)
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
  })
})

describe('buildAuthUrl', () => {
  it('pede acesso offline com consentimento, PKCE e o escopo mínimo', () => {
    const url = new URL(
      buildAuthUrl({
        clientId: client.clientId,
        redirectUri: 'http://127.0.0.1:5123',
        codeChallenge: 'abc',
        state: 'xyz'
      })
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: client.clientId,
      redirect_uri: 'http://127.0.0.1:5123',
      response_type: 'code',
      scope: GCAL_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      state: 'xyz'
    })
  })
})

describe('exchangeCode', () => {
  it('troca o código por tokens e calcula a expiração', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(200, { access_token: 'at', refresh_token: 'rt', expires_in: 3600 })
    )
    const tokens = await exchangeCode(
      fetchFn,
      { ...client, code: 'c', codeVerifier: 'v', redirectUri: 'http://127.0.0.1:5123' },
      1_000
    )
    expect(tokens).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresAt: 1_000 + 3_600_000 })

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(Object.fromEntries(new URLSearchParams(init.body as string))).toEqual({
      client_id: client.clientId,
      client_secret: 'shh',
      code: 'c',
      code_verifier: 'v',
      grant_type: 'authorization_code',
      redirect_uri: 'http://127.0.0.1:5123'
    })
  })

  it('falha quando o Google não devolve refresh token', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { access_token: 'at', expires_in: 3600 }))
    await expect(
      exchangeCode(fetchFn, { ...client, code: 'c', codeVerifier: 'v', redirectUri: 'x' }, 0)
    ).rejects.toThrow(/refresh token/)
  })
})

describe('refreshAccessToken', () => {
  it('renova o access token', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { access_token: 'novo', expires_in: 60 }))
    await expect(
      refreshAccessToken(fetchFn, { ...client, refreshToken: 'rt' }, 0)
    ).resolves.toEqual({ accessToken: 'novo', expiresAt: 60_000 })
  })

  it('invalid_grant vira GoogleAuthRevokedError', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(400, { error: 'invalid_grant', error_description: 'Token has been expired' })
    )
    await expect(
      refreshAccessToken(fetchFn, { ...client, refreshToken: 'rt' }, 0)
    ).rejects.toBeInstanceOf(GoogleAuthRevokedError)
  })

  it('outros erros mantêm a mensagem do Google', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(401, { error: 'invalid_client', error_description: 'The OAuth client was not found.' })
    )
    await expect(refreshAccessToken(fetchFn, { ...client, refreshToken: 'rt' }, 0)).rejects.toThrow(
      'The OAuth client was not found.'
    )
  })
})
