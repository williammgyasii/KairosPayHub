export type RateLimitTier = 'auth' | 'join' | 'api' | 'hubs'

export type RateLimitDecision =
  | { action: 'skip' }
  | { action: 'limit'; tier: RateLimitTier; key: string }

export function resolveRateLimit(
  pathname: string,
  method: string,
  headers: Headers,
  clientIp: string,
): RateLimitDecision {
  if (shouldSkipRateLimit(pathname, method, headers)) {
    return { action: 'skip' }
  }

  const tier = classifyRateLimitTier(pathname, method)
  if (!tier) {
    return { action: 'skip' }
  }

  return {
    action: 'limit',
    tier,
    key: rateLimitKey(tier, pathname, clientIp),
  }
}

export function shouldSkipRateLimit(
  pathname: string,
  method: string,
  headers: Headers,
): boolean {
  if (pathname === '/health') {
    return true
  }

  if (pathname.startsWith('/hubs') && isWebSocketUpgrade(method, headers)) {
    return true
  }

  return false
}

export function classifyRateLimitTier(
  pathname: string,
  method: string,
): RateLimitTier | null {
  if (pathname.startsWith('/auth')) {
    return 'auth'
  }

  if (pathname.startsWith('/api/join/') && method === 'POST') {
    return 'join'
  }

  if (pathname.startsWith('/api')) {
    return 'api'
  }

  if (pathname.startsWith('/hubs')) {
    return 'hubs'
  }

  return null
}

export function rateLimitKey(
  tier: RateLimitTier,
  pathname: string,
  clientIp: string,
): string {
  if (tier === 'join') {
    const token = pathname.slice('/api/join/'.length).split('/')[0] ?? ''
    return `${token}:${clientIp}`
  }

  return clientIp
}

function isWebSocketUpgrade(method: string, headers: Headers): boolean {
  return (
    method === 'GET' &&
    headers.get('Upgrade')?.toLowerCase() === 'websocket'
  )
}
