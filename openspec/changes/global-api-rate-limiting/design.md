## Context

Traffic flow on deployed envs:

```text
Browser → Cloudflare gateway Worker → .NET container
                ↓ (SPA assets)
           Cloudflare Pages
```

The gateway already routes `/api/*`, `/auth/*`, `/hubs/*`, `/health` to the container (`cloudflare/api/src/router.ts`). ASP.NET has one policy today: `join-submit` (5/hour per token+IP).

## Decision: Worker Rate Limiting bindings (not dashboard WAF)

Use [Cloudflare Workers Rate Limiting bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) in the existing gateway Worker instead of WAF dashboard rules or Terraform.

| Option | Pros | Cons |
|--------|------|------|
| **Worker bindings** | In repo, deploys with CI, path-specific logic, no extra plan tier | Per-PoP approximate counts; period fixed to 10s or 60s |
| WAF rate rules | True edge before Worker | Plan-dependent, not in repo today, coarse path matching |
| ASP.NET global limiter | Works locally | Runs after container cold start; no protection if container is overwhelmed |

Worker bindings match our stack: we already own the gateway, and limits are code-reviewed with tests on the **policy manager** (pure classification + keys).

## Architecture

**Manager** (`rate-limit-policy.ts`): given pathname, method, and headers → `{ tier, key } | skip`.

**Engine** (`rate-limit.ts` + `index.ts`): call the binding for that tier; return 429 JSON or continue to container.

```text
request → isApiRequest? → classify policy → limit() → 429 | proxy container
```

## Limits

All bindings use a **60-second** window (Cloudflare constraint).

- **Auth** (`RATE_LIMIT_AUTH`): 10/min per IP — login / password reset brute force.
- **Join** (`RATE_LIMIT_JOIN`): 10/min per `{token}:{ip}` — coarse flood guard; ASP.NET keeps 5/hour.
- **API** (`RATE_LIMIT_API`): 300/min per IP — normal authenticated API usage.
- **Hubs** (`RATE_LIMIT_HUBS`): 120/min per IP — SignalR negotiate/polling; WebSocket upgrades skipped.

Bindings live under each wrangler **environment** (`development` ns `3101–3104`, `production` ns `3001–3004`) — top-level `ratelimits` are not inherited.

429 body matches ASP.NET join limiter: `{"error":"Too many requests. Try again later."}`

## Testing

- **Unit tests** (Vitest) on `rate-limit-policy.ts`: classification, keys, skip rules.
- **No integration test against live Cloudflare** in CI — binding is eventually consistent per PoP; policy tests are the contract.

## Local dev

`127.0.0.1:5173` → `localhost:5192` bypasses the gateway. ASP.NET policies still apply where configured. Edge limits are documented in `infra/environments.md`.

## Rollout

1. Merge + deploy dev gateway; smoke `/health`, login, API call.
2. Deploy prod after dev verification.
3. Monitor Worker Observability for 429 spikes.
