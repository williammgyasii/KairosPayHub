## Why

Gateway rate limits stop floods, but growing customer traffic still needs bot resistance on public forms, account lockout on credential stuffing, browser hardening headers, and OWASP-style edge filtering before the .NET container.

## What Changes

- **Turnstile** on login, register, forgot-password, and public join submit (optional when secret unset — local dev).
- **ASP.NET Identity lockout** after repeated failed logins per account.
- **Security headers** on all gateway responses (HSTS, nosniff, frame deny, referrer policy, CSP report-only).
- **WAF managed rules** via opt-in Terraform (Cloudflare + OWASP rulesets).

## Capabilities

### New Capabilities

- `infra/edge-security`: Turnstile, lockout, gateway headers, zone WAF.

### Modified Capabilities

- (none)

## Impact

- API auth + join controllers, Identity options, new Turnstile verifier.
- Frontend auth/join/password forms + env `VITE_TURNSTILE_SITE_KEY`.
- Gateway Worker headers module, `infra/terraform/waf.tf`, runbook updates.
