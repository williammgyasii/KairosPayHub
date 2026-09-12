## ADDED Requirements

### Requirement: Gateway enforces path-class rate limits

The Cloudflare gateway Worker SHALL rate-limit API-bound requests before proxying to the .NET container. Limits SHALL apply on deployed hostnames (`app.kairospayhub.com`, `dev.app.kairospayhub.com`). `/health` SHALL NOT be rate-limited. WebSocket upgrade requests on `/hubs/*` SHALL NOT be rate-limited.

| Path class | Match | Limit (per key, 60s window) | Key |
|------------|-------|----------------------------|-----|
| Auth | `/auth/*` | 10 | client IP |
| Join submit | `POST /api/join/{token}` | 10 | `{token}:{client IP}` |
| API | `/api/*` (not join submit) | 300 | client IP |
| Hubs | `/hubs/*` (non-upgrade) | 120 | client IP |

When a limit is exceeded, the gateway MUST respond with HTTP **429** and body `{"error":"Too many requests. Try again later."}` without forwarding to the container.

#### Scenario: Auth brute-force is throttled

- **WHEN** a client sends more than 10 requests to `/auth/login` within 60 seconds from the same IP
- **THEN** further requests receive HTTP 429 from the gateway
- **AND** the .NET container is not invoked for those requests

#### Scenario: General API traffic is throttled

- **WHEN** a client sends more than 300 requests to `/api/*` (excluding join submit) within 60 seconds from the same IP
- **THEN** further requests receive HTTP 429 from the gateway

#### Scenario: Join submit has coarse edge protection

- **WHEN** a client sends more than 10 `POST /api/join/{token}` requests within 60 seconds for the same token and IP
- **THEN** further requests receive HTTP 429 from the gateway
- **AND** the ASP.NET join policy (5 per hour per token+IP) remains the precise business limit when traffic is under the edge cap

#### Scenario: Health and hub upgrades are exempt

- **WHEN** a client requests `GET /health` or opens a WebSocket upgrade on `/hubs/*`
- **THEN** the gateway does not apply the API or hubs rate limit tiers to that request
