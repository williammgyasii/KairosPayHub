import { KairosApiContainer } from './container'
import type { Env } from './env'
import { enforceGatewayRateLimit } from './rate-limit'
import { isApiRequest, proxyToPages } from './router'

export { KairosApiContainer }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (isApiRequest(pathname)) {
      const limited = await enforceGatewayRateLimit(request, env)
      if (limited) {
        return limited
      }

      const container = env.API.getByName('singleton')
      return container.fetch(request)
    }

    return proxyToPages(request, env.PAGES_ORIGIN)
  },
}
