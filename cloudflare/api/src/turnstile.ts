import type { Env } from './env'
import { resolveTurnstileRoute, type TurnstileAction } from './turnstile-policy'

const TURNSTILE_ERROR = JSON.stringify({
  error: 'Verification failed. Try again.',
})

type TurnstilePrepareResult =
  | { ok: true; request: Request }
  | { ok: false; response: Response }

export async function prepareTurnstileRequest(
  request: Request,
  env: Env,
): Promise<TurnstilePrepareResult> {
  const { pathname } = new URL(request.url)
  const route = resolveTurnstileRoute(pathname, request.method)

  if (route.action === 'skip' || !env.TURNSTILE_SECRET) {
    return { ok: true, request }
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return {
      ok: false,
      response: new Response(TURNSTILE_ERROR, {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : null
  const clientIp = request.headers.get('CF-Connecting-IP') ?? undefined
  const valid = await verifyTurnstileToken(env, token, route.action, clientIp)

  if (!valid) {
    return {
      ok: false,
      response: new Response(TURNSTILE_ERROR, {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  const headers = new Headers(request.headers)
  headers.set('Content-Type', 'application/json')

  return {
    ok: true,
    request: new Request(request.url, {
      method: request.method,
      headers,
      body: JSON.stringify(body),
    }),
  }
}

async function verifyTurnstileToken(
  env: Env,
  token: string | null,
  expectedAction: TurnstileAction,
  remoteIp?: string,
): Promise<boolean> {
  const allowed = parseHostnames(env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
  if (allowed.size === 0) return false
  if (!token || token.length > 2048) return false

  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET!,
    response: token,
  })
  if (remoteIp) form.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })

  if (!response.ok) return false

  const result = (await response.json()) as {
    success?: boolean
    action?: string
    hostname?: string
  }

  return (
    result.success === true &&
    result.action === expectedAction &&
    typeof result.hostname === 'string' &&
    allowed.has(result.hostname)
  )
}

function parseHostnames(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  )
}
