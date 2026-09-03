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

## Release flow

```text
merge → main → CI passes → deploy-development.yml → Dev Pages + API
git tag v1.2.3 → deploy-production.yml → Prod Pages + API
```

| Target | Trigger | Mechanism |
|--------|---------|-----------|
| **Dev** | Push to `main` after CI green | `.github/workflows/deploy-development.yml` |
| **Prod** | Git tag `v*` | `.github/workflows/deploy-production.yml` |

### GitHub secrets

| Secret | Purpose |
|--------|-----------|
| `CLOUDFLARE_WRANGLER_REFRESH_TOKEN` | Wrangler OAuth refresh token (`cfort_…`) for CI deploy |
| `CLOUDFLARE_ACCOUNT_ID` | `e23518956f08ff35812d9ab001a39880` |

`CLOUDFLARE_API_TOKEN` (DNS-only) is optional in repo `.env` for DNS scripts — **not** used by deploy workflows.

Generate the refresh token locally after `npx wrangler login`:

```bash
grep refresh_token ~/.config/.wrangler/config/default.toml   # Linux CI path
# macOS: ~/Library/Preferences/.wrangler/config/default.toml
gh secret set CLOUDFLARE_WRANGLER_REFRESH_TOKEN
```

API runtime secrets (`DB_CONNECTION_STRING`, `JWT_SIGNING_KEY`, SMTP, R2) are set once per environment via:

```bash
./scripts/provision-cloudflare-environments.sh
```

Or manually: `cd cloudflare/api && wrangler secret put DB_CONNECTION_STRING --env development`

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
