## ADDED Requirements

### Requirement: Turnstile protects public write endpoints

When `Turnstile:Secret` is configured, the system SHALL require a valid Cloudflare Turnstile token on:

- `POST /auth/login` (action `login`)
- `POST /auth/register` (action `register`)
- `POST /auth/forgot-password` (action `forgot_password`)
- `POST /api/join/{token}` (action `join`)

Verification MUST call Cloudflare siteverify, require `success`, matching action, and an allowed hostname. Invalid or missing tokens MUST receive HTTP **403** with a generic error. When the secret is not configured (local dev), verification SHALL be skipped.

On deployed environments, the gateway Worker SHALL verify Turnstile once, strip `turnstileToken` from the forwarded body, and set `X-Kairos-Turnstile-Verified: 1`. The API container MUST NOT re-verify the same token (Turnstile tokens are single-use).

#### Scenario: Gateway verifies once and forwards to API

- **WHEN** a client posts to `/auth/login` with a valid Turnstile token through the gateway Worker
- **THEN** the gateway verifies the token with siteverify
- **AND** the container receives the request without `turnstileToken` and with `X-Kairos-Turnstile-Verified: 1`
- **AND** login proceeds without a second siteverify call

#### Scenario: Login without Turnstile when configured

- **WHEN** Turnstile is configured and a client posts to `/auth/login` without a valid token
- **THEN** the response is HTTP 403
- **AND** no JWT is issued

#### Scenario: Local dev skips Turnstile

- **WHEN** `Turnstile:Secret` is empty and a client posts to `/auth/login`
- **THEN** existing login behavior applies unchanged

### Requirement: Failed login lockout

After **5** failed password attempts for an account within the lockout window, the system SHALL lock that account for **15 minutes**. Locked accounts MUST receive the same generic error as invalid credentials on login.

#### Scenario: Fifth failed attempt locks the account

- **WHEN** a user submits the wrong password 5 times for the same email
- **THEN** the next login attempt with the correct password is rejected with the generic invalid-credentials message

### Requirement: Gateway adds security headers

The gateway Worker SHALL add on every response:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy-Report-Only` allowing the SPA, API same-origin, and `challenges.cloudflare.com` for Turnstile

### Requirement: Zone WAF managed rules

Production zone `kairospayhub.com` SHALL enable Cloudflare Managed Ruleset and OWASP Core Ruleset (paranoia level 2) via Terraform when `manage_waf=true`.
