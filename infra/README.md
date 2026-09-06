# Infrastructure

KairosPayHub runs on **Cloudflare** (Pages, Workers + Containers, DNS, R2) and **Neon** (Postgres).

App deploys use **Wrangler** (GitHub Actions). Account-level resources (zone, R2, etc.) are managed with **Terraform** under [`terraform/`](./terraform/).

| Doc | Purpose |
|-----|---------|
| [`environments.md`](./environments.md) | Operator runbook — URLs, DNS, secrets, smoke tests |
| [`terraform/README.md`](./terraform/README.md) | Terraform layout, auth, plan/apply |
| [`../docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md) | Environment design history |

## Deploy triggers

| Target | URL | Trigger |
|--------|-----|---------|
| Development | https://dev.app.kairospayhub.com | Push to `main` after CI |
| Production | https://app.kairospayhub.com | Git tag `v*` |

Legacy `render.yaml` is reference only — do not deploy to Render.
