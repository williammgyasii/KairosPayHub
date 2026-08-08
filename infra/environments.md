# Environment runbook

KairosPayHub runs on **Render** (API, frontend, Postgres) and **Cloudflare** (DNS, R2).

Full design: [`docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md)

## URLs

| Env | App | API | Health |
|-----|-----|-----|--------|
| Prod | https://app.kairospayhub.com | https://api.kairospayhub.com | `/health` |
| Dev | https://dev.app.kairospayhub.com | https://dev.api.kairospayhub.com | `/health` |
| Local | http://127.0.0.1:5173 | http://localhost:5192 | `/health` |

## Render project

Single Blueprint: **`render.yaml`** → project **KairosPayHub**

| Environment | Services | Database |
|-------------|----------|----------|
| **Development** | `kairospayhub-api-dev`, `kairospayhub-frontend-dev` | `kairospayhub-db-dev` |
| **Production** | `kairospayhub-api`, `kairospayhub-frontend` | `kairospayhub-db` |

Sync: [Render Blueprints](https://dashboard.render.com/blueprints)

## Release flow (Option A)

```text
merge → main → CI passes → deploy-development.yml → Dev API + frontend deploy
git tag v1.2.3 → deploy-production.yml → Prod deploys that commit
```

| Target | Trigger | Mechanism |
|--------|---------|-----------|
| **Dev** | Push to `main` after CI green | `.github/workflows/deploy-development.yml` |
| **Prod** | Git tag `v*` | `.github/workflows/deploy-production.yml` |

### Day-to-day

```bash
# Ship to dev (automatic after merge)
git push origin main

# Promote to prod
git tag v0.2.0
git push origin v0.2.0
```

### GitHub secrets (repo → Settings → Secrets)

| Secret | Value |
|--------|-------|
| `RENDER_API_KEY` | Render dashboard API key |
| `RENDER_DEV_API_SERVICE_ID` | `srv-d9rkbg49v7es73cgt740` |
| `RENDER_DEV_FRONTEND_SERVICE_ID` | `srv-d9rkbgifngtc73dj47tg` |
| `RENDER_PROD_API_SERVICE_ID` | `srv-d9r55e3m8hqs739tni7g` |
| `RENDER_PROD_FRONTEND_SERVICE_ID` | `srv-d9r55fvavr4c73c8c2n0` |

Set via CLI:

```bash
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY"
gh secret set RENDER_DEV_API_SERVICE_ID --body "srv-d9rkbg49v7es73cgt740"
gh secret set RENDER_DEV_FRONTEND_SERVICE_ID --body "srv-d9rkbgifngtc73dj47tg"
gh secret set RENDER_PROD_API_SERVICE_ID --body "srv-d9r55e3m8hqs739tni7g"
gh secret set RENDER_PROD_FRONTEND_SERVICE_ID --body "srv-d9r55fvavr4c73c8c2n0"
```

## Cloudflare DNS (CNAME → Render custom domain hostnames)

| Record | Name |
|--------|------|
| Prod app | `app` |
| Prod API | `api` |
| Dev app | `dev.app` |
| Dev API | `dev.api` |

Proxy: **on** or **off** (both work; currently off). SSL: **Full**.

## R2 buckets

| Bucket | Environment |
|--------|-------------|
| `kairospayhub-assets` | Production |
| `kairospayhub-assets-dev` | Dev + local |

## Secrets to set manually (Render dashboard)

On **both** API services:

- `Jwt__SigningKey` — unique per environment (min 32 chars)
- `Email__Smtp__Host`, `Username`, `Password`, `FromAddress`
- `R2__AccessKeyId`, `R2__SecretAccessKey`, `R2__Endpoint`, `R2__PublicBaseUrl`

## Postgres connection strings

| Where | Use |
|-------|-----|
| Render API service → Render Postgres (same region) | **Internal** URL (`@dpg-…-a/…`, no `.render.com`) |
| Local laptop / TablePlus | **External** URL (`@dpg-…-a.ohio-postgres.render.com/…`) |

## Local `.env`

- Copy from `.env.example`
- Use **dev** database URL only (external)
- Use **dev** R2 bucket + public URL
- Never commit `.env`

## Smoke test

```bash
curl -s https://dev.api.kairospayhub.com/health
curl -s https://api.kairospayhub.com/health
```

Both should return `{"status":"healthy"}`.

## Provision script

`scripts/provision-dev-environment.py` — one-time dev stack setup (legacy; prefer Blueprint sync).
