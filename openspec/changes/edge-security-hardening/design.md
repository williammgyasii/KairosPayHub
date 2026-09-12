## Turnstile

- **Frontend**: shared `TurnstileField` loads explicit render API; `VITE_TURNSTILE_SITE_KEY` gates visibility.
- **Gateway (deployed)**: `prepareTurnstileRequest` in the Worker verifies once via siteverify, strips `turnstileToken` from the body (tokens are single-use), and sets internal header `X-Kairos-Turnstile-Verified: 1` before forwarding to the container.
- **Backend**: `TurnstileVerifier` POSTs to siteverify when the gateway header is absent (local dev or direct API). `TurnstileGate` skips verification when `X-Kairos-Turnstile-Verified: 1` is present. Hostname allowlist from `Turnstile:AllowedHostnames` (comma-separated).
- **Secrets**: `TURNSTILE_SECRET` on gateway Worker + `Turnstile__Secret` on container (same value). Site key on Pages build (`VITE_TURNSTILE_SITE_KEY` GitHub secret). Both envs must stay in sync when the widget is rotated.
- **Dev/test keys**: Cloudflare `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` for local testing.

## Lockout

Configure `IdentityOptions.Lockout` in `DependencyInjection.cs`. Use `AccessFailedAsync` / `ResetAccessFailedCountAsync` in `AuthService.LoginAsync` (already checks `IsLockedOutAsync`).

## Security headers

Pure function `applySecurityHeaders(response)` in gateway; called on every outbound response from `index.ts`.

## WAF

Opt-in `manage_waf` in Terraform (like R2). Requires Zone WAF Edit on API token. Manual `terraform apply -var='manage_waf=true'` until team enables remote state apply.
