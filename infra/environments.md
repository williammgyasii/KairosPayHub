# Environment runbook

KairosPayHub runs on **Cloudflare** (Pages frontend, Workers + Containers API, DNS, R2) and **Neon** (Postgres).

Legacy Render config is kept in `render.yaml` for reference only — **do not deploy to Render**.

Full design history: [`docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md)

## URLs

| Env | App (gateway) | API paths | Health |
|-----|---------------|-----------|--------|
| Prod | https://app.kairospayhub.com | same origin `/api/*`, `/auth/*`, `/hubs/*` | `/health` |
| Dev | https://dev.app.kairospayhub.com | same origin | `/health` |
| Local | http://127.0.0.1:5173 | http://localhost:5192 | `/health` |

## Cloudflare stack

Single **gateway Worker** on the app hostname proxies:

- `/api/*`, `/auth/*`, `/hubs/*`, `/health` → .NET container
- everything else → Cloudflare Pages (`*.pages.dev`)

| Env | Pages project | Gateway Worker | Database |
|-----|---------------|----------------|----------|
| **Development** | `kairospayhub-frontend-dev` | `kairospayhub-api-dev` | Neon `kairospayhub-dev` |
| **Production** | `kairospayhub-frontend` | `kairospayhub-api` | Neon `kairospayhub-prod` |

| Path | Purpose |
|------|---------|
| `cloudflare/api/` | Gateway Worker + .NET container (`kairospayhub-api/Dockerfile`) |
| `kairospayhub-frontend/` | Vite SPA → Cloudflare Pages |
| `scripts/provision-cloudflare-environments.sh` | One-time / manual full provision + deploy |

## Gateway rate limiting

Deployed hostnames only (`dev.app` / `app`). Local Vite → `localhost:5192` bypasses the gateway.

The gateway Worker applies Cloudflare Rate Limiting bindings before proxying to the .NET container. Excess traffic receives HTTP **429** with `{"error":"Too many requests. Try again later."}`.

| Tier | Path | Limit (60s window) | Key |
|------|------|-------------------|-----|
| Auth | `/auth/*` | 10 | client IP |
| Join submit | `POST /api/join/{token}` | 10 | `{token}:{IP}` |
| API | other `/api/*` | 300 | client IP |
| Hubs | `/hubs/*` (not WebSocket upgrade) | 120 | client IP |

`/health` and WebSocket upgrades on `/hubs/*` are exempt. ASP.NET still enforces join submit at 5/hour per token+IP inside the container.

Policy logic: `cloudflare/api/src/rate-limit-policy.ts`. Bindings: `cloudflare/api/wrangler.jsonc`.

## Edge security (Turnstile, headers, WAF)

| Layer | What |
|-------|------|
| **Turnstile** | Login, register, forgot-password, join submit — widget when `VITE_TURNSTILE_SITE_KEY` is set; API verifies via `Turnstile__Secret` |
| **Lockout** | 5 failed logins → 15 min account lock (ASP.NET Identity) |
| **Headers** | HSTS, nosniff, frame deny, referrer policy, CSP report-only on all gateway responses |
| **WAF** | Opt-in Terraform `manage_waf=true` — Cloudflare Managed + OWASP PL2 |

**Turnstile setup**

1. Cloudflare Dashboard → Turnstile → create widget for `app.kairospayhub.com`, `dev.app.kairospayhub.com`, `localhost`, `127.0.0.1`.
2. Store **secret** on **both** gateway Workers (must match the widget):  
   `printf '%s' '<secret>' | wrangler secret put TURNSTILE_SECRET --env development`  
   `printf '%s' '<secret>' | wrangler secret put TURNSTILE_SECRET --env production`  
   Get secret from `wrangler turnstile widget get <sitekey>`.
3. Set **site key** on Pages build: GitHub secret `VITE_TURNSTILE_SITE_KEY` (dev/prod can share one widget or use separate keys per env).

**If login shows “Verification failed. Try again.”** — check (a) site key and `TURNSTILE_SECRET` are in sync on that environment, or (b) the API is not re-verifying an already-consumed token (gateway must verify once and set `X-Kairos-Turnstile-Verified: 1`). Updating the GitHub site key or recreating the widget requires re-running step 2 for **development and production**.
4. Allowed hostnames are in `wrangler.jsonc` as `TURNSTILE_ALLOWED_HOSTNAMES` (passed to container as `Turnstile__AllowedHostnames`).

Local dev: leave `VITE_TURNSTILE_SITE_KEY` unset and `Turnstile__Secret` empty — verification is skipped.

Cloudflare test keys (always pass): site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

## Observability

Gateway Workers (`kairospayhub-api-dev`, `kairospayhub-api`) have **Workers Observability** enabled in `cloudflare/api/wrangler.jsonc`:

- **Invocation logs** — every request through the gateway (route, status, duration)
- **Traces** — distributed traces for Worker + container routing
- **Container stdout** — ASP.NET Core console logs (`Information` default) appear in the same log stream

View in Cloudflare Dashboard → **Workers & Pages** → select the worker → **Observability** (Logs / Traces tabs). Filter by `$metadata.service` or search for `/api/`, `/health`, etc.

After changing `observability` in wrangler, redeploy the gateway (`wrangler deploy --env development|production`) or push to `main` / tag for CI.

## Release flow

```text
merge → main → CI passes → deploy-development.yml → https://dev.app.kairospayhub.com
git tag v1.2.3 → deploy-production.yml → https://app.kairospayhub.com
```

| Target | Trigger | Mechanism | GitHub Environment |
|--------|---------|-----------|--------------------|
| **Dev** | Push to `main` after CI green | `.github/workflows/deploy-development.yml` | `development` → https://dev.app.kairospayhub.com |
| **Prod** | Git tag `v*` | `.github/workflows/deploy-production.yml` | `production` → https://app.kairospayhub.com |

GitHub **Deployments** / **Environments** should link to those app URLs (not only Wrangler Worker names).

Account infra (R2, zone metadata): see [`terraform/`](./terraform/) and `.github/workflows/terraform-plan.yml`.

### GitHub secrets

| Secret | Purpose |
|--------|-----------|
| `CLOUDFLARE_API_TOKEN` | **Recommended** — Cloudflare API token for CI deploy (Workers, Pages, Containers). Does not rotate. |
| `CLOUDFLARE_WRANGLER_REFRESH_TOKEN` | Fallback — wrangler OAuth refresh token (`cfort_…`). **Rotates on each CI refresh**; re-sync after deploy auth failures. |
| `CLOUDFLARE_ACCOUNT_ID` | `e23518956f08ff35812d9ab001a39880` |
| `WEB_PUSH_PUBLIC_KEY` | VAPID public key — **environment-scoped** (`development` vs `production`). Separate pair per env. |
| `WEB_PUSH_PRIVATE_KEY` | VAPID private key — same environment scope. Never commit. |
| `WEB_PUSH_SUBJECT` | `mailto:noreply@kairospayhub.com` |

Create a deploy API token in Cloudflare Dashboard → My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template, then add **Cloudflare Pages — Edit** and **Account — Cloudflare Containers — Edit**. Store as:

```bash
gh secret set CLOUDFLARE_API_TOKEN
```

If OAuth fallback is used, re-sync after `npx wrangler login` (refresh tokens rotate when wrangler refreshes in CI):

```bash
grep refresh_token ~/Library/Preferences/.wrangler/config/default.toml   # macOS
# Linux CI path: ~/.config/.wrangler/config/default.toml
gh secret set CLOUDFLARE_WRANGLER_REFRESH_TOKEN
```

API runtime secrets (`DB_CONNECTION_STRING`, `JWT_SIGNING_KEY`, SMTP, R2) are set once per environment via:

```bash
./scripts/provision-cloudflare-environments.sh
```

Or manually: `cd cloudflare/api && wrangler secret put DB_CONNECTION_STRING --env development`

Web Push uses a **separate VAPID pair per environment**. Generate with `npx web-push generate-vapid-keys`, put `WebPush__*` in local `.env`, and store the same names as GitHub **environment** secrets (`development` / `production`). Deploy workflows and `Sync Web Push secrets` upload them to the Worker before `wrangler deploy`, so a release cannot ship without the keys. Missing keys on a running container skip OS push; inbox + SignalR still work.

## Neon databases

| Project | Database | Use |
|---------|----------|-----|
| `kairospayhub-dev` | `kairospayhub_dev` | Local + deployed dev |
| `kairospayhub-prod` | `kairospayhub` | Production |

Create prod:

```bash
neonctl projects create --name kairospayhub-prod --database kairospayhub --pg-version 16
```

Store URLs in `.env` as `ConnectionStrings__Default` (local/dev) and `NEON_PROD_CONNECTION_STRING` (prod provision script).

## R2 buckets

| Bucket | Environment |
|--------|-------------|
| `kairospayhub-assets` | Production |
| `kairospayhub-assets-dev` | Dev + local |

## DNS cutover (one-time)

The gateway Worker owns `dev.app` / `app` via **Workers custom domains** (required for two-level subdomains + SSL). Pages stays on `*.pages.dev`; the Worker proxies static assets.

```bash
chmod +x scripts/finish-cloudflare-cutover.sh
./scripts/finish-cloudflare-cutover.sh
```

Until cutover completes, use workers.dev URLs for API smoke tests.

**Local wrangler auth:** run `cd cloudflare/api && npx wrangler login` if deploy fails. Remove invalid `CLOUDFLARE_API_KEY` from `.env` — it overrides OAuth.

1. Copy `.env.example` → `.env` (Neon dev URL, R2 dev bucket, JWT key).
2. API: `cd kairospayhub-api/src/KairosPayHub.Api && dotnet run --urls http://localhost:5192`
3. Frontend: `cd kairospayhub-frontend && VITE_API_URL=http://localhost:5192 npm run dev`

## Smoke test

```bash
curl -s https://dev.app.kairospayhub.com/health
curl -s https://app.kairospayhub.com/health
```

Both should return `{"status":"healthy"}`.

## First-time Cloudflare provision

Requires Docker running (container image build).

```bash
chmod +x scripts/provision-cloudflare-environments.sh
./scripts/provision-cloudflare-environments.sh
```

This sets Worker secrets, deploys dev API + frontend, and prod if `NEON_PROD_CONNECTION_STRING` is set.
