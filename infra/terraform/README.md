# Cloudflare Terraform (account infra)

Manages **account-level** Cloudflare resources.  
**App deploys** (Workers gateway + Pages) stay on **Wrangler** via `.github/workflows/deploy-*.yml`.

## Layout

| File | Purpose |
|------|---------|
| `versions.tf` | Terraform + Cloudflare provider |
| `providers.tf` | Cloudflare auth (`CLOUDFLARE_API_TOKEN`) |
| `variables.tf` | Account id, zone name, optional R2 |
| `zone.tf` | Zone data source (always) |
| `r2.tf` | R2 buckets (opt-in via `manage_r2`) |
| `waf.tf` | Zone WAF managed rules (opt-in via `manage_waf`) |
| `outputs.tf` | Zone id, app URLs, bucket names |

## Auth

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone Read is enough for default plan
export TF_VAR_cloudflare_account_id=e23518956f08ff35812d9ab001a39880
```

Default config only **reads the zone** (no creates). That keeps CI `terraform plan` green.

### Optional: manage R2

1. Extend the API token with **Account — Cloudflare R2 Storage — Edit**.
2. Import existing buckets, then enable management:

```bash
cd infra/terraform
terraform import 'cloudflare_r2_bucket.assets[0]' '<account_id>/kairospayhub-assets'
terraform import 'cloudflare_r2_bucket.assets_dev[0]' '<account_id>/kairospayhub-assets-dev'
terraform apply -var='manage_r2=true'
```

Or set `manage_r2 = true` in a `terraform.tfvars` (gitignored) after imports.

### Optional: enable WAF managed rules

1. Extend the API token with **Zone — WAF — Edit**.
2. Apply:

```bash
cd infra/terraform
terraform apply -var='manage_waf=true'
```

If rules already exist in the dashboard, import the zone ruleset before apply.

## Local commands

```bash
cd infra/terraform
terraform init
terraform plan
```

## CI

PRs / pushes that touch `infra/terraform/**` run **Terraform Plan** (`.github/workflows/terraform-plan.yml`).  
**Apply is not automated** until remote state is configured and R2 (if used) is imported.

## Remote state (next step)

Prefer Cloudflare R2 or Terraform Cloud for shared state before team apply. Until then, keep state local (ignored by git — see `infra/.gitignore`).
