import type { Env } from './env'
import { resolveRateLimit, type RateLimitTier } from './rate-limit-policy'

const RATE_LIMIT_ERROR = JSON.stringify({
  error: 'Too many requests. Try again later.',
})

export async function enforceGatewayRateLimit(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const { pathname } = new URL(request.url)
  const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const decision = resolveRateLimit(
    pathname,
    request.method,
    request.headers,
    clientIp,
  )

  if (decision.action === 'skip') {
    return null
  }

  const limiter = limiterForTier(env, decision.tier)
  const { success } = await limiter.limit({ key: decision.key })

  if (success) {
    return null
  }

  return new Response(RATE_LIMIT_ERROR, {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  })
}

function limiterForTier(env: Env, tier: RateLimitTier) {
  switch (tier) {
    case 'auth':
      return env.RATE_LIMIT_AUTH
    case 'join':
      return env.RATE_LIMIT_JOIN
    case 'api':
      return env.RATE_LIMIT_API
    case 'hubs':
      return env.RATE_LIMIT_HUBS
  }
}
