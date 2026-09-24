import { afterEach, describe, expect, it, vi } from 'vitest'

const ACCESS_KEY = 'kairospayhub_access'
const REFRESH_KEY = 'kairospayhub_refresh'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => data.clear(),
  }
}

const storage = memoryStorage()

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  storage.clear()
  sessionStorage.clear()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('getSession', () => {
  it('refreshes a single-use token once when restore runs twice', async () => {
    vi.stubGlobal('localStorage', storage)
    sessionStorage.setItem(ACCESS_KEY, 'expired-access')
    storage.setItem(REFRESH_KEY, 'refresh-1')

    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const headers = new Headers(init?.headers)
        if (url.endsWith('/auth/me')) {
          if (headers.get('Authorization') === 'Bearer new-access') {
            return json({ email: 'william@kairospayhub.com', emailConfirmed: true })
          }
          return json({ error: 'expired' }, 401)
        }
        if (url.endsWith('/auth/refresh')) {
          refreshCalls += 1
          await new Promise((resolve) => setTimeout(resolve, 30))
          return json({
            accessToken: 'new-access',
            refreshToken: 'refresh-2',
            emailConfirmed: true,
          })
        }
        throw new Error(`unexpected ${url}`)
      }),
    )

    const { getSession: restore } = await import('./client')
    const [first, second] = await Promise.all([restore(), restore()])

    expect(refreshCalls).toBe(1)
    expect(first?.email).toBe('william@kairospayhub.com')
    expect(second?.token).toBe('new-access')
    expect(storage.getItem(REFRESH_KEY)).toBe('refresh-2')
  })
})
