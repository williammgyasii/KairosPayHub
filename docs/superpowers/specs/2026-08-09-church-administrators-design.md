# Church administrators design

**Date:** 2026-08-09  
**Builds on:** [`2026-08-07-api-auth-design.md`](./2026-08-07-api-auth-design.md), [`2026-08-07-mvp-domain-design.md`](./2026-08-07-mvp-domain-design.md)  
**Prerequisite:** Pastor onboarding + ASP.NET Identity auth — **done**

## Goal

Let the **pastor** create one or more **church administrators** — backup accounts with the same church-wide powers when the pastor is unavailable. Managed under **Settings → Administrators**. Each admin uses a **unique login email** (never shared with an existing account).

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Role | New `ChurchAdmin` on `RoleAssignment` — not a duplicate `Pastor` login |
| Powers | **Same as pastor** for day-to-day church operations (structure, givings, attendance, approvals, branding, roster) |
| Who manages admins | Pastor **and** existing church admins can add / deactivate admins |
| Primary pastor | The **onboarding pastor** cannot be removed or demoted by an admin (prevent lockout) |
| Affiliation (**A**) | **`InChurch`** — optionally linked to an existing roster `Member`; **`External`** — not on roster (office staff, etc.) |
| Email | Must be **globally unique** (Identity + app DB); optional **Suggest email** from pastor’s email |
| Password | Pastor sets password on create **or** sends set-password invite link (same as leader invite) |
| Settings UI | Settings page gets a **sidebar** with sub-paths; **Administrators** is one section |

---

## Domain model

### `ChurchRole` enum (extend)

Add:

```text
ChurchAdmin
```

`CurrentActor` role precedence: `Pastor` > `ChurchAdmin` > `PFCCManager` > …

### `ChurchAdministrator` (new entity)

One row per admin login for a church.

| Field | Notes |
|-------|--------|
| `Id`, `ChurchId` | Tenant |
| `AuthUserId` | ASP.NET Identity user id — links to login |
| `FirstName`, `LastName` | Required |
| `Email` | Unique login; denormalized from Identity for list views |
| `AffiliationKind` | `InChurch`, `External` |
| `MemberId` | Required when `InChurch`; optional/null when `External` |
| `IsActive` | Soft deactivate — login blocked, assignment ignored |
| `CreatedByAuthUserId`, `CreatedAt` | Audit |
| `DeactivatedByAuthUserId`, `DeactivatedAt` | When `IsActive = false` |

**Also create** matching `RoleAssignment`:

- `Role = ChurchAdmin`
- `ChurchId` = church
- `AuthUserId` = admin user
- No `ScopeNodeId` (church-wide)

**Uniqueness:**

- One active `ChurchAdministrator` row per `(ChurchId, AuthUserId)`
- One active `ChurchAdmin` assignment per church per auth user
- Email unique across Identity (existing check)

### Affiliation rules

| Kind | Meaning | `MemberId` |
|------|---------|------------|
| `InChurch` | Admin is also someone on the roster | Required — pick existing member; link does **not** change their cell/fellowship role |
| `External` | Not on roster (secretary, treasurer off-roster, etc.) | Must be null |

If `InChurch`, optionally display member’s structure path in the admin list. Do **not** auto-merge their leader/member login with admin login — admin is always a **separate email account**.

---

## Authorization

Introduce a single helper used across services (extend `GivingScopeService` or add `ChurchAuthorizationService`):

```csharp
bool CanManageChurch(Actor actor) =>
    actor.StructureRole is ChurchRole.Pastor or ChurchRole.ChurchAdmin;
```

Replace pastor-only guards for **operational** actions with `CanManageChurch`:

- Structure template / nodes / members
- Giving programs, approvals (when pastor is approver)
- Attendance meeting types, excuse, reopen, override
- Church logo / branding
- Overall dashboards

**Stay pastor-only** (v1):

- Nothing in v1 — admins have operational parity. **Exception:** cannot deactivate the **primary onboarding pastor** assignment.

**Church admin management** (`POST/DELETE administrators`):

- Allowed for `Pastor` and `ChurchAdmin`

**Frontend nav:**

- `ChurchAdmin` sees same sidebar as pastor (Structure, full Givings, full Attendance when shipped, Settings including Administrators)
- Scoped leaders unchanged

**`/api/me`:**

- Return `role: "ChurchAdmin"` when that assignment is active
- Add `isChurchAdmin` or rely on role string; update `isPastor()` → add `canManageChurch(role)`

---

## Email & account provisioning

### Create flow (pastor or admin)

1. Pastor fills: first name, last name, email, affiliation, optional member picker, password mode
2. API validates:
   - Email format + **not** already in Identity (`FindByEmailAsync`)
   - Not equal to any existing admin/pastor email in same church (redundant if global unique)
   - If `InChurch`: `MemberId` belongs to church and has no other active admin link
3. Create Identity user + `RoleAssignment` + `ChurchAdministrator` row
4. **Password mode A — set now:** pastor provides password (min rules match Identity policy)
5. **Password mode B — invite:** email set-password link (reuse `LeaderInviteService` / `AuthService.CreateSetPasswordTokenAsync`)

### Suggest email (UI helper)

Client-side + server-side suggestion from pastor’s email:

| Pastor email | Suggested admin email |
|--------------|----------------------|
| `pastor@grace.org` | `pastor.admin@grace.org` |
| `john@gmail.com` | `john.admin@gmail.com` |

Algorithm: insert `.admin` before `@`. If taken, append `-2`, `-3`, … until unique. Pastor can edit before submit.

---

## API surface (v1)

| Method | Route | Who |
|--------|-------|-----|
| `GET` | `/api/settings/administrators` | `CanManageChurch` |
| `POST` | `/api/settings/administrators` | `CanManageChurch` |
| `POST` | `/api/settings/administrators/suggest-email` | `CanManageChurch` — body: `{ "baseEmail": "..." }` |
| `PATCH` | `/api/settings/administrators/{id}/deactivate` | `CanManageChurch` — cannot target primary pastor |
| `PATCH` | `/api/settings/administrators/{id}/reactivate` | `CanManageChurch` |
| `POST` | `/api/settings/administrators/{id}/reset-password` | `CanManageChurch` — sends set-password link |

List response includes: name, email, affiliation, member summary (if in-church), active, createdAt.

---

## UI (v1)

### Settings layout with sidebar

Mirror Givings / Attendance nav pattern inside Settings:

| Sub-path | Route | Content |
|----------|-------|---------|
| **Branding** | `/settings` or `/settings/branding` | Existing logo upload (move from flat page) |
| **Account** | `/settings/account` | Current user email / password link |
| **Administrators** | `/settings/administrators` | Admin list + add form |

Pastor **and** church admin see all three. Route guard: `CanManageChurch`.

### Administrators page

- **Table:** Name, email, affiliation badge (In church / External), member name if linked, status, added date
- **Add administrator** dialog:
  - First name, last name
  - Email + **Suggest email** button
  - Affiliation toggle: In church → member search/select; External → hide picker
  - Password: Set password now | Send invite email
- Row actions: Deactivate, Resend invite (if never logged in)

Inline validation: email uniqueness error from API (“This email is already in use”).

---

## Primary pastor protection

Track the **first** `ChurchRole.Pastor` assignment for the church (`CreatedAt` minimum or flag `IsPrimaryPastor` on assignment — prefer explicit `IsPrimaryPastor` on the onboarding-created assignment).

- Admins **cannot** deactivate primary pastor
- Primary pastor **can** deactivate admins
- v1: primary pastor cannot transfer primary status (future enhancement)

---

## Notifications & audit

- Optional email to new admin on create (invite or “your account was created”)
- Log `CreatedByAuthUserId` / `DeactivatedByAuthUserId` on admin rows
- Future: audit log table — out of scope v1

---

## Migration

- EF migration: `church_administrators` table + `ChurchAdmin` in role enum (stored as string)
- Optional: `IsPrimaryPastor` column on `role_assignments` — backfill for existing pastor rows per church

---

## Testing focus

- Pastor creates external admin → admin logs in → can create giving program
- Pastor creates in-church admin linked to member → list shows member name
- Duplicate email rejected
- Suggest-email returns available variant
- Admin deactivates another admin; cannot deactivate primary pastor
- Deactivated admin gets 403 on API

---

## Out of scope (v1)

- Admin permission subsets (read-only admin, finance-only, etc.)
- Transfer primary pastorship
- Admin acting as a scoped leader simultaneously (separate logins per role)
- SSO / MFA

---

## Implementation order (after spec approval)

1. **Backend:** enum + entity + migration + `CanManageChurch` refactor + administrators API + tests  
2. **Frontend:** Settings sidebar layout + Administrators page + `canManageChurch` nav updates  
3. **Follow-up:** Replace remaining stray `isPastor`-only checks in frontend pages

Each step: failing tests → review → implement → review.
