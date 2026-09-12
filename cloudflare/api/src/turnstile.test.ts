import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Env } from './env'
import { prepareTurnstileRequest } from './turnstile'
import {
  TURNSTILE_VERIFIED_HEADER,
  TURNSTILE_VERIFIED_VALUE,
} from './turnstile-verified-header'

const baseEnv = {
  TURNSTILE_SECRET: 'test-secret',
  TURNSTILE_ALLOWED_HOSTNAMES: 'app.kairospayhub.com',
} as Env

function loginRequest(body: Record<string, unknown>) {
  return new Request('https://app.kairospayhub.com/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.10',
    },
    body: JSON.stringify(body),
  })
}

describe('prepareTurnstileRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('strips turnstileToken and marks request verified after siteverify succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          success: true,
          action: 'login',
          hostname: 'app.kairospayhub.com',
        }),
      ),
    )

    const result = await prepareTurnstileRequest(
      loginRequest({
        email: 'user@church.org',
        password: 'secret',
        turnstileToken: 'cf-token',
      }),
      baseEnv,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.request.headers.get(TURNSTILE_VERIFIED_HEADER)).toBe(
      TURNSTILE_VERIFIED_VALUE,
    )

    const forwarded = (await result.request.json()) as Record<string, unknown>
    expect(forwarded.turnstileToken).toBeUndefined()
    expect(forwarded.email).toBe('user@church.org')
  })

  it('rejects login when turnstileToken is missing', async () => {
    const result = await prepareTurnstileRequest(
      loginRequest({ email: 'user@church.org', password: 'secret' }),
      baseEnv,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(403)
  })
})
