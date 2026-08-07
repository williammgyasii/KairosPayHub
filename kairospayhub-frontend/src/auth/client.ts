const ACCESS_KEY = 'kairospayhub_access'
const REFRESH_KEY = 'kairospayhub_refresh'

export interface Session {
  email: string | null
  token: string
}

function apiBase(): string {
  return import.meta.env.VITE_API_URL.replace(/\/+$/, '')
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

function storeTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export async function register(name: string, email: string, password: string): Promise<void> {
  await authPost('/auth/register', { name, email, password })
}

export async function confirmEmail(email: string, code: string): Promise<void> {
  await authPost('/auth/confirm-email', { email, code })
}

export async function resendConfirmation(email: string): Promise<void> {
  await authPost('/auth/resend-confirmation', { email })
}

export async function signIn(email: string, password: string): Promise<Session> {
  const data = await authPost<{ accessToken: string; refreshToken: string }>('/auth/login', {
    email,
    password,
  })
  storeTokens(data.accessToken, data.refreshToken)
  return { email, token: data.accessToken }
}

export async function setPassword(token: string, password: string): Promise<void> {
  await authPost('/auth/set-password', { token, password })
}

export async function forgotPassword(email: string): Promise<void> {
  await authPost('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await authPost('/auth/reset-password', { token, password })
}

export function signOut(): void {
  const refresh = localStorage.getItem(REFRESH_KEY)
  clearTokens()
  if (refresh) {
    void authPost('/auth/logout', { refreshToken: refresh }).catch(() => {})
  }
}

async function refreshSession(): Promise<Session | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null

  try {
    const data = await authPost<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken: refresh,
    })
    storeTokens(data.accessToken, data.refreshToken)

    const me = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    })
    if (!me.ok) return { email: null, token: data.accessToken }
    const profile = (await me.json()) as { email?: string }
    return { email: profile.email ?? null, token: data.accessToken }
  } catch {
    clearTokens()
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const access = sessionStorage.getItem(ACCESS_KEY)
  if (access) {
    return { email: null, token: access }
  }
  return refreshSession()
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY)
}

export async function getToken(): Promise<string | null> {
  const access = getAccessToken()
  if (access) return access

  const session = await refreshSession()
  return session?.token ?? null
}
