## Turnstile

- **Frontend**: shared `TurnstileField` loads explicit render API; `VITE_TURNSTILE_SITE_KEY` gates visibility.
- **Backend**: `TurnstileVerifier` POSTs to siteverify; hostname allowlist from `Turnstile:AllowedHostnames` (comma-separated).
- **Secrets**: `Turnstile__Secret` on container (wrangler secret + `.env` local). Site key on Pages build (`VITE_TURNSTILE_SITE_KEY` GitHub secret).
- **Dev/test keys**: Cloudflare `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` for local testing.

## Lockout

Configure `IdentityOptions.Lockout` in `DependencyInjection.cs`. Use `AccessFailedAsync` / `ResetAccessFailedCountAsync` in `AuthService.LoginAsync` (already checks `IsLockedOutAsync`).

## Security headers

Pure function `applySecurityHeaders(response)` in gateway; called on every outbound response from `index.ts`.

## WAF

Opt-in `manage_waf` in Terraform (like R2). Requires Zone WAF Edit on API token. Manual `terraform apply -var='manage_waf=true'` until team enables remote state apply.
