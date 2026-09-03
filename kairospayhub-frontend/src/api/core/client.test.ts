import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from './client'

function mockFetch(response: { status: number; body?: unknown }) {
  const bodyText = response.body !== undefined ? JSON.stringify(response.body) : ''
  const fn = vi.fn(
    async () =>
      new Response(bodyText || null, {
        status: response.status,
        headers: bodyText ? { 'Content-Type': 'application/json' } : {},
      }),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

const headersOf = (init: RequestInit | undefined) =>
  (init?.headers ?? {}) as Record<string, string>

describe('createApiClient', () => {
  it('attaches the bearer token from getToken', async () => {
    const fetchMock = mockFetch({ status: 200, body: { ok: true } })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => 'tok123',
    })

    await client.get('/api/me')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/me')
    expect(headersOf(init)['Authorization']).toBe('Bearer tok123')
  })

  it('omits Authorization when there is no token', async () => {
    const fetchMock = mockFetch({ status: 200, body: {} })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => null,
    })

    await client.get('/api/me')

    expect(headersOf(fetchMock.mock.calls[0][1])['Authorization']).toBeUndefined()
  })

  it('joins base and path without double slashes', async () => {
    const fetchMock = mockFetch({ status: 200, body: {} })
    const client = createApiClient({
      baseUrl: 'https://api.example.com/',
      getToken: async () => null,
    })

    await client.get('/api/churches')

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/churches')
  })

  it('sends a JSON body and content-type on post', async () => {
    const fetchMock = mockFetch({ status: 200, body: { id: '1' } })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => 't',
    })

    await client.post('/api/onboarding', { organizationName: 'Grace' })

    const init = fetchMock.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect(headersOf(init)['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ organizationName: 'Grace' }))
  })

  it('parses and returns JSON on success', async () => {
    mockFetch({ status: 200, body: { onboarded: false } })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => null,
    })

    const data = await client.get<{ onboarded: boolean }>('/api/me')

    expect(data).toEqual({ onboarded: false })
  })

  it('returns undefined on 204 No Content', async () => {
    mockFetch({ status: 204 })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => null,
    })

    const data = await client.delete('/api/records/1')

    expect(data).toBeUndefined()
  })

  it('throws ApiError with status and parsed body on non-2xx', async () => {
    mockFetch({ status: 403, body: { error: 'Forbidden' } })
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => 't',
    })

    const err = await client.get('/api/records').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
    expect(err.body).toEqual({ error: 'Forbidden' })
  })
})
