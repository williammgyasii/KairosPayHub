import { apiBaseUrl } from '@/shared/api/api-base'

const TOKEN_KEY = 'kairospayhub_operator'

export function operatorToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function saveOperatorToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function signOutOperator() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function signInOperator(email: string, password: string, turnstileToken?: string | null) {
  const res = await fetch(`${apiBaseUrl()}/api/outreach/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, turnstileToken }),
  })
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; error?: string }
  if (!res.ok || !data.accessToken) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Invalid email or password')
  }
  saveOperatorToken(data.accessToken)
}

export async function operatorPost<T>(path: string, body: unknown): Promise<T> {
  return operatorSend<T>('POST', path, body)
}

export async function operatorGet<T>(path: string): Promise<T> {
  return operatorSend<T>('GET', path)
}

export async function operatorPatch<T>(path: string, body: unknown): Promise<T> {
  return operatorSend<T>('PATCH', path, body)
}

async function operatorSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = operatorToken()
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : `Request failed with status ${res.status}`)
  }
  return data as T
}
