## Why

The API only rate-limits public cell-join submits in ASP.NET. Every other route — login, authenticated APIs, SignalR negotiate — is unprotected at the edge, so a leaked link or brute-force script can flood the container before app logic runs.

## What Changes

- Add **gateway-level rate limiting** on the Cloudflare Worker that fronts `app.kairospayhub.com` and `dev.app.kairospayhub.com`.
- Tier limits by path class: `/auth/*`, `/api/join/*` POST, general `/api/*`, and `/hubs/*`.
- Exempt `/health` and WebSocket upgrade requests on hubs.
- Return HTTP **429** with the same JSON error shape the API already uses for join submits.
- Keep the existing ASP.NET join policy (5/hour per token+IP) as the precise business rule; the gateway adds coarse flood protection.

## Capabilities

### New Capabilities

- `infra/gateway-rate-limiting`: Edge rate limits on the gateway Worker before traffic reaches the .NET container.

### Modified Capabilities

- (none — join submit limits in ASP.NET stay as-is)

## Impact

- **Cloudflare**: `cloudflare/api/` gateway Worker, `wrangler.jsonc` rate-limit bindings, new policy module + tests.
- **API**: No change to controllers; existing join integration test remains the authority for token-level limits.
- **Local dev**: Unchanged — local Vite → localhost API bypasses the gateway.
- **Deploy**: Requires wrangler deploy (CI on merge) so bindings are live on dev/prod hostnames.
