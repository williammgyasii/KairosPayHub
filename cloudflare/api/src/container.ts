import { Container } from '@cloudflare/containers'
import { buildContainerEnv, type Env } from './env'

export class KairosApiContainer extends Container {
  defaultPort = 8080
  requiredPorts = [8080]
  sleepAfter = '30m'
  enableInternet = true

  override async fetch(request: Request): Promise<Response> {
    this.envVars = buildContainerEnv(this.env as Env)
    return super.fetch(request)
  }
}
