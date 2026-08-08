# KairosPayHub Environments Design

**Date:** 2026-08-08  
**Status:** Approved direction — pending infra provisioning  
**Goal:** Separate **dev** and **prod** deployments with isolated databases and config, while keeping **Cloudflare** for DNS + object storage and **Render** for compute.

---

## Decisions

| Topic | Choice |
|-------|--------|
| App hosting (API + SPA) | **Render** — one stack per environment |
| Database | **Render Postgres** — one database per environment |
| DNS | **Cloudflare** — all public hostnames |
| File storage (logos, screenshots later) | **Cloudflare R2** — separate bucket per environment |
| Email | **Resend SMTP** — same provider; link base URL differs per env |

---

## Hostnames

| Environment | Frontend | API | Notes |
|-------------|----------|-----|-------|
| **Production** | `https://app.kairospayhub.com` | `https://api.kairospayhub.com` | Live churches |
| **Development (deployed)** | `https://dev.app.kairospayhub.com` | `https://dev.api.kairospayhub.com` | Staging / integration testing |
| **Local** | `http://127.0.0.1:5173` | `http://localhost:5192` | Developer machine |

Asset URLs use R2 public base URLs (or custom domains later):

| Environment | R2 bucket | Public base (initial) |
|-------------|-----------|------------------------|
| Prod | `kairospayhub-assets` | `https://pub-….r2.dev` or `assets.kairospayhub.com` |
| Dev | `kairospayhub-assets-dev` | separate `pub-….r2.dev` URL |

---

## Architecture

```text
                    Cloudflare DNS (kairospayhub.com)
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          │                                                   │
    PROD hostnames                                      DEV hostnames
 app / api                                             dev.app / dev.api
          │                                                   │
          ▼                                                   ▼
   Render prod stack                                   Render dev stack
   ├─ kairospayhub-api                                ├─ kairospayhub-api-dev
   ├─ kairospayhub-frontend                          ├─ kairospayhub-frontend-dev
   └─ kairospayhub-db                                └─ kairospayhub-db-dev
          │                                                   │
          └───────────────┬───────────────────────────────────┘
                          ▼
                   Cloudflare R2
              (prod bucket / dev bucket)

LOCAL (not in diagram): localhost API + SPA → dev DB + dev R2 only
```

---

## Render services

### Production (`render.yaml`)

| Resource | Name | Branch | Domain |
|----------|------|--------|--------|
| Web (Docker) | `kairospayhub-api` | `main` | `api.kairospayhub.com` |
| Static site | `kairospayhub-frontend` | `main` | `app.kairospayhub.com` |
| Postgres | `kairospayhub-db` | — | internal only |

### Development (`render.dev.yaml`)

| Resource | Name | Branch | Domain |
|----------|------|--------|--------|
| Web (Docker) | `kairospayhub-api-dev` | `develop`* | `dev.api.kairospayhub.com` |
| Static site | `kairospayhub-frontend-dev` | `develop`* | `dev.app.kairospayhub.com` |
| Postgres | `kairospayhub-db-dev` | — | internal only |

\* Until a `develop` branch exists, temporarily set branch to `main` in the Render dashboard or create `develop` from `main`.

---

## Environment variable matrix

Values marked **secret** are set in Render dashboard (`sync: false`) or local `.env` (never committed).

| Variable | Local | Dev (Render) | Prod (Render) |
|----------|-------|--------------|---------------|
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Production` | `Production` |
| `ConnectionStrings__Default` | dev DB URL **secret** | from `kairospayhub-db-dev` | from `kairospayhub-db` |
| `Database__MigrateOnStartup` | `true` | `true` | `true` |
| `Jwt__Issuer` | `http://localhost:5192` | `https://dev.api.kairospayhub.com` | `https://api.kairospayhub.com` |
| `Jwt__Audience` | `kairospayhub` | `kairospayhub-dev` | `kairospayhub` |
| `Jwt__SigningKey` | local **secret** | dev **secret** | prod **secret** |
| `Cors__Origins__0` | `http://127.0.0.1:5173` | `https://dev.app.kairospayhub.com` | `https://app.kairospayhub.com` |
| `Cors__Origins__1` | `http://localhost:5173` | `http://127.0.0.1:5173` (optional) | — |
| `Email__FrontendBaseUrl` | `http://127.0.0.1:5173` | `https://dev.app.kairospayhub.com` | `https://app.kairospayhub.com` |
| `Email__FromAddress` | `noreply@kairospayhub.com` | same | same |
| `Email__Smtp__*` | Resend **secret** | Resend **secret** | Resend **secret** |
| `R2__BucketName` | `kairospayhub-assets-dev` | `kairospayhub-assets-dev` | `kairospayhub-assets` |
| `R2__PublicBaseUrl` | dev pub URL **secret** | dev pub URL **secret** | prod pub URL **secret** |
| `R2__AccessKeyId` / `Secret` / `Endpoint` | Cloudflare **secret** | same keys OK* | same keys OK* |
| `VITE_API_URL` (frontend build) | `http://localhost:5192` | `https://dev.api.kairospayhub.com` | `https://api.kairospayhub.com` |

\* One R2 API token can access multiple buckets; restrict token to both buckets in Cloudflare if possible.

### Isolation rules

1. **Never** point local `.env` at the prod database.
2. **Never** reuse prod `Jwt__SigningKey` in dev.
3. Dev and prod migrations run independently against their own DB.
4. Logo uploads in dev must not appear in prod (separate R2 buckets).

---

## Cloudflare DNS

Create **proxied** CNAME records (orange cloud) after Render custom domains are verified:

| Type | Name | Target |
|------|------|--------|
| CNAME | `app` | Render hostname for prod frontend |
| CNAME | `api` | Render hostname for prod API |
| CNAME | `dev.app` | Render hostname for dev frontend |
| CNAME | `dev.api` | Render hostname for dev API |

SSL mode: **Full** (Render terminates TLS on custom domains).

Optional later:

| CNAME | `assets` | R2 public bucket custom domain (prod) |
| CNAME | `dev.assets` | R2 public bucket custom domain (dev) |

---

## Cloudflare R2

| Bucket | Purpose | CORS |
|--------|---------|------|
| `kairospayhub-assets` | Prod church logos (+ future contribution screenshots) | Allow prod app origin |
| `kairospayhub-assets-dev` | Dev/test uploads | Allow dev app + localhost |

Enable public access (`r2.dev` subdomain) per bucket; store each bucket’s public URL in the matching Render env vars.

Create dev bucket:

```bash
# After: source .env (Cloudflare credentials)
wrangler r2 bucket create kairospayhub-assets-dev
# Enable public access in Cloudflare dashboard → R2 → bucket → Settings
```

---

## Local development

1. Copy `.env.example` → `.env`.
2. Set `ConnectionStrings__Default` to **dev** Render Postgres **external** URL (or local Docker Postgres).
3. Set R2 vars to **dev** bucket + dev public URL.
4. Run API: `dotnet run --launch-profile http` (port 5192).
5. Run SPA: `VITE_API_URL=http://localhost:5192 npm run dev`.

Local API uses `appsettings.Development.json` for JWT issuer localhost + CORS for 5173.

---

## Git & deploy flow

| Branch | Deploys to | Blueprint |
|--------|------------|-----------|
| `main` | Production | `render.yaml` |
| `develop` | Development | `render.dev.yaml` |

Workflow:

1. Feature branch → PR → merge to `develop` → auto-deploy dev.
2. Validate on `dev.app` / `dev.api`.
3. Merge `develop` → `main` → auto-deploy prod.

---

## Repo files

| File | Role |
|------|------|
| `render.yaml` | Prod Render Blueprint |
| `render.dev.yaml` | Dev Render Blueprint |
| `.env.example` | Documented template (no secrets) |
| `.env` | Local secrets → **dev resources only** (gitignored) |
| `wrangler.toml` | Cloudflare account + R2 notes |
| `infra/environments.md` | Operator runbook (DNS, dashboards, smoke tests) |

---

## Provisioning checklist

### One-time setup

- [ ] Create `develop` branch from `main`
- [ ] Connect `render.dev.yaml` as second Blueprint in Render
- [ ] Set secret env vars on **both** API services (JWT, SMTP, R2 URLs)
- [ ] Create R2 bucket `kairospayhub-assets-dev` + public URL
- [ ] Add Cloudflare DNS CNAMEs for all four hostnames
- [ ] Verify custom domains on all four Render services
- [ ] Update local `.env` to dev DB (rotate prod password if it was ever in `.env`)

### Smoke tests (each environment)

- [ ] `GET /health` on API URL returns 200
- [ ] SPA loads and login works
- [ ] Logo upload writes to correct R2 bucket
- [ ] Email links use correct `FrontendBaseUrl`

---

## Out of scope (for now)

- Cloudflare Pages (frontend stays on Render)
- Preview environments per PR
- Separate Resend subdomains per environment
- Terraform / automated DNS

---

## Next step after provisioning

Resume **Records / Giving** work (MVP spec Phase 2+) against **dev** first, then promote to prod.

---

## Approval

Direction confirmed: **Render (dev + prod) + Cloudflare (DNS + R2)**. Implement provisioning checklist before feature work.
