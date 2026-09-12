import { KairosApiContainer } from './container'
import type { Env } from './env'
import { enforceGatewayRateLimit } from './rate-limit'
import { isApiRequest, proxyToPages } from './router'
import { applySecurityHeaders } from './security-headers'
import { prepareTurnstileRequest } from './turnstile'

export { KairosApiContainer }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (isApiRequest(pathname)) {
      const limited = await enforceGatewayRateLimit(request, env)
      if (limited) {
        return applySecurityHeaders(limited)
      }

      const turnstile = await prepareTurnstileRequest(request, env)
      if (!turnstile.ok) {
        return applySecurityHeaders(turnstile.response)
      }

      const container = env.API.getByName('singleton')
      return applySecurityHeaders(await container.fetch(turnstile.request))
    }

    return applySecurityHeaders(await proxyToPages(request, env.PAGES_ORIGIN))
  },
}
