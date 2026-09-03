# Environment runbook

KairosPayHub runs on **Cloudflare** (Pages frontend, Workers + Containers API, DNS, R2) and **Neon** (Postgres).

Legacy Render config is kept in `render.yaml` for reference only — **do not deploy to Render**.

Full design history: [`docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md)

## URLs

| Env | App | API | Health |
|-----|-----|-----|--------|
| Prod | https://app.kairospayhub.com | https://api.kairospayhub.com | `/health` |
| Dev | https://dev.app.kairospayhub.com | https://dev.api.kairospayhub.com | `/health` |
| Local | http://127.0.0.1:5173 | http://localhost:5192 | `/health` |

## Cloudflare stack

| Env | Frontend (Pages) | API (Worker + Container) | Database |
|-----|------------------|---------------------------|----------|
| **Development** | `kairospayhub-frontend-dev` | `kairospayhub-api-dev` | Neon `kairospayhub-dev` |
| **Production** | `kairospayhub-frontend` | `kairospayhub-api` | Neon `kairospayhub-prod` |

| Path | Purpose |
|------|---------|
| `cloudflare/api/` | Worker router + .NET container (`kairospayhub-api/Dockerfile`) |
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
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (Workers + Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | `e23518956f08ff35812d9ab001a39880` |

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

Worker **zone routes** handle `dev.api` / `api` when hostnames are in the Cloudflare zone (orange-cloud proxied).

Pages frontends need CNAME updates away from Render:

| Hostname | Target |
|----------|--------|
| `dev.app.kairospayhub.com` | `kairospayhub-frontend-dev.pages.dev` |
| `app.kairospayhub.com` | `kairospayhub-frontend.pages.dev` |

With a Cloudflare API token (`Zone.DNS` Edit):

```bash
chmod +x scripts/setup-cloudflare-dns.sh
./scripts/setup-cloudflare-dns.sh
```

Or update manually in the Cloudflare dashboard. Until then, use:

- Dev app: https://kairospayhub-frontend-dev.pages.dev
- Prod app: https://kairospayhub-frontend.pages.dev
- Dev API: https://kairospayhub-api-dev.williammgyasii.workers.dev (or `dev.api` after DNS)
- Prod API: https://kairospayhub-api.williammgyasii.workers.dev

**Local wrangler auth:** run `cd cloudflare/api && npx wrangler login` if deploy fails. Remove invalid `CLOUDFLARE_API_KEY` from `.env` — it overrides OAuth.

1. Copy `.env.example` → `.env` (Neon dev URL, R2 dev bucket, JWT key).
2. API: `cd kairospayhub-api/src/KairosPayHub.Api && dotnet run --urls http://localhost:5192`
3. Frontend: `cd kairospayhub-frontend && VITE_API_URL=http://localhost:5192 npm run dev`

## Smoke test

```bash
curl -s https://dev.api.kairospayhub.com/health
curl -s https://api.kairospayhub.com/health
```

Both should return `{"status":"healthy"}`.

## First-time Cloudflare provision

Requires Docker running (container image build).

```bash
chmod +x scripts/provision-cloudflare-environments.sh
./scripts/provision-cloudflare-environments.sh
```

This sets Worker secrets, deploys dev API + frontend, and prod if `NEON_PROD_CONNECTION_STRING` is set.
