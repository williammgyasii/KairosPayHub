# KairosPayHub: API-owned auth (replace Cognito)

**Date:** 2026-08-07  
**Status:** Draft — pending review  
**Goal:** Remove AWS Cognito; the .NET API owns identity, sessions, and transactional email via SMTP.

---

## Context

KairosPayHub is a church/ministry payment tracking app:

- **Frontend:** React SPA on Render (`app.kairospayhub.com`)
- **API:** .NET 10 on Render (`api.kairospayhub.com`)
- **Database:** Postgres on Render (`kairospayhub-db`, Ohio)
- **DNS:** Cloudflare

**Today:** Cognito handles email/password auth and issues ID tokens. The API validates Cognito JWTs and maps `sub` → `Users.CognitoSub`. Roles (Pastor/Leader), orgs, and churches live in Postgres — not in Cognito.

**Remaining AWS:** Cognito user pool only (`infra/cognito.tf`).

---

## Decisions

| Decision | Choice |
|----------|--------|
| Identity owner | .NET API (ASP.NET Identity) |
| Token model | Short-lived access JWT + refresh token |
| Transactional email | SMTP (for now) |
| Tenancy / roles | Unchanged — Postgres `Users` table remains source of truth |
| AWS | Destroy Cognito after new auth is live in production |

---

## Target architecture

```
┌─────────────┐     HTTPS      ┌─────────────┐
│  React SPA  │ ──────────────▶│  .NET API   │
│   (Render)  │◀────────────── │   (Render)  │
└─────────────┘  JWT + refresh └──────┬──────┘
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    Postgres      SMTP server   (no AWS)
                    Identity +    (confirm,
                    app tables    invite, reset)
```

**Unchanged principle:** JWT proves *who* the user is. Postgres decides *what they can do* (Pastor vs Leader, org, church).

---

## Backend design

### ASP.NET Identity

- Add Identity to the existing `KairosDbContext` (or a dedicated context sharing the same Postgres DB).
- Identity tables: `AspNetUsers`, `AspNetRoles`, tokens, etc.
- Password policy (match current Cognito rules): min 8 chars, upper, lower, number.

### Linking Identity to app users

- Rename `Users.CognitoSub` → `Users.AuthSubject` (string, stores Identity user id).
- Migration renames column; no data migration needed if Cognito users are discarded (greenfield auth).
- `CurrentActor` looks up by `AuthSubject` instead of `CognitoSub`.

### JWT configuration

| Setting | Value |
|---------|-------|
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days |
| Signing | Symmetric key from env (`Jwt:SigningKey`) |
| Issuer | `https://api.kairospayhub.com` |
| Audience | `kairospayhub` |
| Claims | `sub` (user id), `email`, `name` |

Replace Cognito JWT middleware with standard `AddJwtBearer` using local validation (issuer, audience, signing key).

### Refresh tokens

- Stored **hashed** in a `RefreshTokens` table (token id, user id, expiry, revoked flag).
- Returned to client on login/register/refresh.
- **Phase 1:** store refresh token in `localStorage` (same pattern as Cognito SDK today).
- **Phase 2 (optional):** move to `httpOnly` cookie on `.kairospayhub.com`.

### Auth API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Pastor self-signup (name, email, password) |
| POST | `/auth/confirm-email` | Verify 6-digit code |
| POST | `/auth/resend-confirmation` | Resend confirmation code |
| POST | `/auth/login` | Email + password → access + refresh tokens |
| POST | `/auth/refresh` | Refresh token → new access (+ rotated refresh) |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Set new password from token |
| POST | `/auth/set-password` | Leader first-time password from invite token |
| GET | `/auth/me` | Current Identity user (email, name, emailConfirmed) |

Existing app endpoints (`/api/onboarding`, `/api/leaders`, etc.) stay the same; they still use `[Authorize]` + `CurrentActor`.

### Email via SMTP

Configuration (env vars on Render):

```
Email__Smtp__Host=
Email__Smtp__Port=587
Email__Smtp__Username=
Email__Smtp__Password=
Email__Smtp__UseTls=true
Email__FromAddress=noreply@kairospayhub.com
Email__FromName=KairosPayHub
Email__FrontendBaseUrl=https://app.kairospayhub.com
```

**Emails sent:**

1. **Email confirmation** — 6-digit code (pastor signup; same UX as today).
2. **Leader invite** — link to `/set-password?token=…` (replaces Cognito temp password email).
3. **Password reset** — link to `/reset-password?token=…`.

Implementation: `IEmailSender` abstraction with `SmtpEmailSender` using `MailKit` or `System.Net.Mail`. Tokens stored hashed in DB with expiry.

**Dev/local:** Mailpit or similar via `appsettings.Development.json`; tests use a fake `IEmailSender` that captures messages.

### Leader invite (replaces Cognito AdminCreateUser)

`LeaderInviteService` changes to:

1. Verify caller is Pastor (unchanged).
2. Create Identity user (email confirmed = false or true with invite flow).
3. Create app `User` row (`Role=Leader`, `ChurchId`, `AuthSubject`).
4. Generate invite token; email set-password link via SMTP.
5. Return app user DTO (unchanged API contract where possible).

### Onboarding

Unchanged: authenticated user with no app `User` row calls `POST /api/onboarding` to create org + Pastor row.

---

## Frontend design

### Replace `cognito.ts`

New module `auth/client.ts` calling API:

- `register`, `confirmEmail`, `resendConfirmation`
- `login`, `refresh`, `logout`
- `getSession` — reads access token from memory; refreshes via `/auth/refresh` if expired
- `getToken` — used by `useApi()` (unchanged interface)

Remove `amazon-cognito-identity-js` dependency.

### Pages

| Page | Change |
|------|--------|
| SignUp | Call `/auth/register` + `/auth/confirm-email` |
| Login | Call `/auth/login` |
| **New:** SetPassword | Leader invite landing (`/set-password?token=…`) |
| **New:** ForgotPassword / ResetPassword | Optional in phase 1 if not already present |

`AuthContext` interface stays the same (`signIn`, `signOut`, `status`, `email`).

### Env vars

Remove:

- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

No new frontend env vars required (API URL already set).

---

## AWS teardown (after prod verification)

**Do not run until new auth works on Render.**

1. Remove Cognito env vars from Render API service.
2. `cd infra && terraform destroy` (Cognito user pool + client + domain).
3. Delete `infra/` directory (or leave a README noting auth moved to API).
4. Remove AWS SDK / Cognito packages from API csproj.
5. Update `render.yaml` — drop Cognito and AWS credential env vars.
6. Update `.env.example` with SMTP + JWT settings.

---

## Testing strategy

**TDD per project convention:**

1. **API integration tests** (existing `ApiFactory` pattern):
   - Register → confirm → login → access protected endpoint
   - Onboarding after login
   - Pastor invites leader → set password → leader can submit record
   - Refresh token rotation
   - Invalid/expired tokens rejected

2. **Test auth:** replace Cognito-specific `TestAuthHandler` with a test JWT issuer or continue bypass for non-auth tests.

3. **Email:** fake sender asserts confirmation/invite emails contain expected codes/links.

---

## Implementation phases

| Phase | Scope | Stops for review |
|-------|-------|------------------|
| **1** | Identity + JWT + auth endpoints + tests (no frontend) | Yes — review tests |
| **2** | SMTP sender + email flows + tests | Yes — review tests |
| **3** | Frontend auth swap | Yes — review UI |
| **4** | Leader invite rewrite | Yes |
| **5** | Deploy Render + smoke test | Yes |
| **6** | AWS destroy + cleanup | Yes — explicit approval |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| SMTP deliverability (spam) | Use a real mailbox/domain; plan move to Resend later |
| Existing Cognito users lost | Acceptable — pre-production; no user migration |
| JWT key rotation | Document manual key roll; short access token limits blast radius |
| Refresh token theft | HTTPS only; rotate on refresh; optional httpOnly cookie later |

---

## Out of scope (for now)

- Social login (Google, etc.)
- MFA
- Resend/SendGrid migration (future drop-in via `IEmailSender`)
- User migration from Cognito

---

## Open items

None — SMTP chosen for transactional email.
