export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface ApiClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
  delete: <T = void>(path: string) => Promise<T>
}

interface Options {
  baseUrl: string
  getToken: () => Promise<string | null>
}

export function createApiClient({ baseUrl, getToken }: Options): ApiClient {
  const base = baseUrl.replace(/\/+$/, '')

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken()
    const headers: Record<string, string> = {
      ...((init?.headers as Record<string, string>) ?? {}),
    }
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${base}${path}`, { ...init, headers })

    const text = await res.text()
    const data = text ? JSON.parse(text) : undefined

    if (!res.ok) {
      throw new ApiError(res.status, `Request failed with status ${res.status}`, data)
    }
    return data as T
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  }
}
