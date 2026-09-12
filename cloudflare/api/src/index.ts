import { KairosApiContainer } from './container'
import type { Env } from './env'
import { enforceGatewayRateLimit } from './rate-limit'
import { isApiRequest, proxyToPages } from './router'
import { applySecurityHeaders } from './security-headers'

export { KairosApiContainer }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (isApiRequest(pathname)) {
      const limited = await enforceGatewayRateLimit(request, env)
      if (limited) {
        return applySecurityHeaders(limited)
      }

      const container = env.API.getByName('singleton')
      return applySecurityHeaders(await container.fetch(request))
    }

    return applySecurityHeaders(await proxyToPages(request, env.PAGES_ORIGIN))
  },
}
