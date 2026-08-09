# Church Administrators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pastor and church admins manage backup administrator accounts under Settings → Administrators, with full church-wide powers and unique login emails.

**Architecture:** New `ChurchAdministrator` entity + `ChurchRole.ChurchAdmin` assignment; central `CanManageChurch()` helper replaces pastor-only guards for operational APIs; Settings gets a sidebar with `/settings/administrators`.

**Tech Stack:** .NET 8 API, EF Core, ASP.NET Identity, React + Vite.

**Spec:** [`docs/superpowers/specs/2026-08-09-church-administrators-design.md`](../specs/2026-08-09-church-administrators-design.md)

## Global Constraints

- Email globally unique (Identity `FindByEmailAsync`).
- Primary onboarding pastor cannot be deactivated.
- Do not commit unless the user explicitly asks.
- Restart dev servers after runtime changes.

---

### Task 1: Domain, migration, primary pastor flag

**Files:**
- Modify: `Domain/Structure/ChurchRole.cs`
- Modify: `Domain/Structure/Entities.cs` (`RoleAssignment.IsPrimaryPastor`)
- Create: `Domain/Administrators/ChurchAdministratorEntities.cs`
- Modify: `Data/KairosDbContext.cs`
- Migration: `AddChurchAdministrators`

- [ ] Add `ChurchAdmin` to enum; `IsPrimaryPastor` on `RoleAssignment`
- [ ] Set `IsPrimaryPastor = true` in `OnboardingController` pastor assignments
- [ ] `ChurchAdministrator` entity per spec
- [ ] Generate migration; run tests

---

### Task 2: `CanManageChurch` authorization helper

**Files:**
- Modify: `Services/GivingScopeService.cs` (add `CanManageChurch`, `IsChurchAdmin`)
- Modify: `Auth/CurrentActor.cs` (role precedence includes ChurchAdmin)

- [ ] `CanManageChurch` = Pastor or ChurchAdmin
- [ ] Update `MapLegacyRole`: ChurchAdmin → `Role.Pastor` for legacy checks OR add `Role.ChurchAdmin` — use `Role.Pastor` legacy mapping for ChurchAdmin so existing `actor.Role != Role.Pastor` in LeaderInviteService still works; prefer updating all guards to `CanManageChurch`

---

### Task 3: Administrators API + service

**Files:**
- Create: `Services/ChurchAdministratorService.cs`
- Create: `Controllers/SettingsAdministratorsController.cs`
- Create: `tests/.../ChurchAdministratorApiTests.cs`

- [ ] List, create (password + invite modes), suggest-email, deactivate, reactivate
- [ ] Integration tests for create, duplicate email reject, admin can access giving

---

### Task 4: Refactor pastor-only guards (backend)

**Files:** `GivingProgramService`, `AttendanceMeetingTypeService`, `StructureService` (pastor checks), `ChurchBrandingService`, `LeaderInviteService`, etc.

- [ ] Replace `IsPastor` / `Role.Pastor` operational guards with `CanManageChurch`

---

### Task 5: Frontend — settings sidebar + administrators UI

**Files:**
- Create: `components/settings/settings-layout.tsx`
- Modify: `App.tsx`, `SettingsPage.tsx`
- Create: `pages/SettingsAdministratorsPage.tsx`, `api/administrators.ts`
- Modify: `api/me.ts`, `app-sidebar.tsx`, `PastorRoute` → `ChurchManagerRoute`

- [ ] Settings sub-nav; administrators CRUD UI

---

### Task 6: Frontend nav parity for ChurchAdmin

- [ ] Church admin sees pastor sidebar (Structure, Settings, Overall givings, etc.)
