import { KairosApiContainer } from './container'
import type { Env } from './env'

export { KairosApiContainer }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = env.API.getByName('singleton')
    return container.fetch(request)
  },
}
