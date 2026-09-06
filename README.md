# KairosPayHub

Church management SaaS for **giving**, **attendance**, and **structure/roster** — multi-tenant by church, with role-scoped leaders (pastor, PFCC, fellowship, cell).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite → Cloudflare Pages |
| API | .NET 10 → Cloudflare Workers + Containers |
| Database | Neon Postgres |
| Assets | Cloudflare R2 |
| Specs | [OpenSpec](openspec/) change-driven requirements |

App and API share one hostname (gateway Worker proxies `/api/*`, `/auth/*`, `/hubs/*`; everything else is the SPA).

## Environments

| Env | URL | Deploy trigger |
|-----|-----|----------------|
| **Production** | https://app.kairospayhub.com | Git tag `v*` → [Deploy to Production](.github/workflows/deploy-production.yml) |
| **Development** | https://dev.app.kairospayhub.com | Push to `main` (after CI) → [Deploy to Development](.github/workflows/deploy-development.yml) |
| **Local** | http://127.0.0.1:5173 · API http://localhost:5192 | Manual |

Releases are tracked on GitHub: [Releases](https://github.com/williammgyasii/KairosPayHub/releases).

Health checks:

```bash
curl -s https://dev.app.kairospayhub.com/health
curl -s https://app.kairospayhub.com/health
```

## Local development

1. Copy `.env.example` → `.env` (Neon, JWT, R2 as needed).
2. API:

```bash
cd kairospayhub-api/src/KairosPayHub.Api
set -a && source ../../../.env 2>/dev/null; set +a
dotnet run --urls "http://localhost:5192"
```

3. Frontend:

```bash
cd kairospayhub-frontend
VITE_API_URL=http://localhost:5192 npm run dev -- --host 127.0.0.1 --port 5173
```

## Repo layout

```text
kairospayhub-frontend/   SPA
kairospayhub-api/        .NET API + tests
cloudflare/api/          Gateway Worker + container wiring (Wrangler)
infra/                   Operator runbook + Terraform (DNS / R2)
openspec/                Feature proposals, specs, tasks
docs/                    Architecture notes & how we document
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [`docs/README.md`](docs/README.md) | How we document + doc index |
| [`infra/environments.md`](infra/environments.md) | URLs, secrets, smoke tests, Cloudflare/Neon |
| [`infra/terraform/`](infra/terraform/) | Cloudflare account infra (Terraform) |
| [`openspec/`](openspec/) | Spec-driven feature work |

## Contributing flow

1. Prefer an OpenSpec change under `openspec/changes/<name>/` for user-facing behavior.
2. Spec → tests → implement (small chunks).
3. Merge to `main` → auto-deploy **dev**.
4. Tag `vX.Y.Z` when ready for **prod** (creates a GitHub Release and runs production deploy).
