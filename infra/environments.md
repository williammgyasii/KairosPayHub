# Environment runbook

KairosPayHub uses **Render** for app hosting and **Cloudflare** for DNS + R2 storage.

Full design: [`docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md)

## URLs

| Env | App | API | Health |
|-----|-----|-----|--------|
| Prod | https://app.kairospayhub.com | https://api.kairospayhub.com | `/health` |
| Dev | https://dev.app.kairospayhub.com | https://dev.api.kairospayhub.com | `/health` |
| Local | http://127.0.0.1:5173 | http://localhost:5192 | `/health` |

## Blueprints

| File | Environment | Git branch |
|------|-------------|------------|
| `render.yaml` | Production | `main` |
| `render.dev.yaml` | Development | `develop` |

Connect both in [Render Blueprints](https://dashboard.render.com/blueprints).

## Cloudflare DNS (CNAME → Render custom domain hostnames)

| Record | Name |
|--------|------|
| Prod app | `app` |
| Prod API | `api` |
| Dev app | `dev.app` |
| Dev API | `dev.api` |

Proxy: **on** (orange cloud). SSL: **Full**.

## R2 buckets

| Bucket | Environment |
|--------|-------------|
| `kairospayhub-assets` | Production |
| `kairospayhub-assets-dev` | Dev + recommended local |

```bash
source .env   # Cloudflare credentials
wrangler r2 bucket create kairospayhub-assets-dev
```

Enable public `r2.dev` access per bucket in the Cloudflare dashboard; paste each public URL into the matching Render service env vars (`R2__PublicBaseUrl`).

## Secrets to set manually (Render dashboard)

On **both** API services (`kairospayhub-api` and `kairospayhub-api-dev`):

- `Jwt__SigningKey` — unique per environment (min 32 chars)
- `Email__Smtp__Host`, `Username`, `Password`, `FromAddress`
- `R2__AccessKeyId`, `R2__SecretAccessKey`, `R2__Endpoint`, `R2__PublicBaseUrl`

## Local `.env`

- Copy from `.env.example`
- Use **dev** database URL only
- Use **dev** R2 bucket + public URL
- Never commit `.env`

## Deploy flow

1. Merge to `develop` → dev stack updates
2. Test on `dev.app.kairospayhub.com`
3. Merge `develop` → `main` → prod stack updates

## Smoke test

```bash
curl -s https://dev.api.kairospayhub.com/health
curl -s https://api.kairospayhub.com/health
```

Both should return `{"status":"healthy"}`.
