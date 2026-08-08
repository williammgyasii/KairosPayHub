# Infrastructure

KairosPayHub runs on **Render** (API, frontend, Postgres) and **Cloudflare** (DNS, R2).

| Doc | Purpose |
|-----|---------|
| [`environments.md`](./environments.md) | Operator runbook — URLs, DNS, secrets, smoke tests |
| [`../docs/superpowers/specs/2026-08-08-environments-design.md`](../docs/superpowers/specs/2026-08-08-environments-design.md) | Full environment design spec |

| Blueprint | Environment |
|-----------|-------------|
| `render.yaml` | Production (`main`) |
| `render.dev.yaml` | Development (`develop`) |

AWS/Cognito infrastructure was removed; see git history if you need to clean up orphaned AWS resources.
