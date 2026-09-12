export type TurnstileAction = 'login' | 'register' | 'forgot_password' | 'join'

export type TurnstileRoute =
  | { action: TurnstileAction; rebuildBody: true }
  | { action: 'skip' }

export function resolveTurnstileRoute(pathname: string, method: string): TurnstileRoute {
  if (method !== 'POST') return { action: 'skip' }

  if (pathname === '/auth/login') return { action: 'login', rebuildBody: true }
  if (pathname === '/auth/register') return { action: 'register', rebuildBody: true }
  if (pathname === '/auth/forgot-password') {
    return { action: 'forgot_password', rebuildBody: true }
  }
  if (pathname.startsWith('/api/join/') && pathname.length > '/api/join/'.length) {
    return { action: 'join', rebuildBody: true }
  }

  return { action: 'skip' }
}
