# Giving system design (Phases 2–7)

**Date:** 2026-08-08  
**Builds on:** [`2026-08-07-mvp-domain-design.md`](./2026-08-07-mvp-domain-design.md)  
**Prerequisite:** Structure template + nodes + members (Phase 1b/1c) — **done**

## Goal

Replace the legacy flat `Record` model with **GivingProgram** + **Contribution**, scoped by church structure, with cell-leader entry, fellowship-leader approval, and member view-only history.

## Database migrations (dev + prod)

Both Render environments run migrations on deploy:

| Environment | Postgres | Trigger |
|-------------|----------|---------|
| **Development** | `kairospayhub-db-dev` | `Database__MigrateOnStartup=true` in `render.yaml` |
| **Production** | `kairospayhub-db` | same |

Local: `Database:MigrateOnStartup` in `appsettings.json` (default `true`).

**Rule:** Every schema change ships as an EF migration in the repo. Merging to `main` migrates **dev** on next deploy; tagging **`v*`** migrates **prod** on deploy. Never apply schema by hand on one DB only.

Integration tests use Testcontainers + `MigrateAsync()` in `PostgresFixture` — same migration chain as deployed envs.

---

## Domain model

### GivingProgram

| Field | Notes |
|-------|--------|
| `Id`, `ChurchId` | Tenant |
| `GivingType` | `Rhapsody`, `SundayService`, `SpecialProgram`, `FellowshipGiving`, … |
| `Title` | e.g. "Rhapsody 2026" |
| `PeriodLabel` | e.g. "2026", "January 2026" |
| `ScopeKind` | `ChurchWide`, `Fellowship`, `PFCC`, `FellowshipGroup` |
| `ScopeNodeId` | Root of scope (nullable for `ChurchWide`) |
| `Status` | `Open`, `Closed` |
| `CreatedByAuthUserId` | Creator |
| `CreatedAt` | |

**Uniqueness:** One open church-wide program per `(ChurchId, GivingType, PeriodLabel)`.

**Scoped programs (Phase 6):** `FellowshipGroup` uses `GivingProgramScopeNode` join rows for selected fellowship nodes.

### Contribution (Phase 3+)

| Field | Notes |
|-------|--------|
| `ProgramId`, `MemberId` | Required |
| `Amount`, `Currency` | Default GHS |
| `DateSent` | When member paid |
| `AttachmentKey` | R2 object key — screenshot required |
| `Notes` | Optional |
| `EnteredByAuthUserId` | Cell leader |
| `MemberParentNodeId` | Denormalized cell node at entry time |
| `Status` | `PendingApproval`, `Approved`, `Rejected` |
| `ApprovedByAuthUserId`, `ApprovedAt` | Fellowship leader (MVP) |

**Roll-ups:** Walk structure ancestors from `MemberParentNodeId` by layer `StandardType` — no fixed PFCC/Fellowship/Cell columns.

### Authorization (MVP)

| Role | Programs | Contributions |
|------|----------|---------------|
| Pastor | Create **church-wide**; see all | View all; no entry (MVP) |
| PFCC manager | Phase 6: scoped create | View subtree |
| Fellowship leader | Phase 6: scoped create | **Approve** in scope |
| Cell leader | View in scope | **Create** for members in cell |
| Member | — | **View own only** |

Uses existing `RoleAssignment` + `ScopeNodeId` and structure subtree checks.

---

## API surface (incremental)

| Phase | Routes |
|-------|--------|
| **2** | `GET/POST /api/giving/programs`, `GET /api/giving/programs/{id}` |
| **3** | `POST /api/giving/programs/{id}/contributions`, `POST /api/giving/attachments` (R2 upload) |
| **4** | `POST .../contributions/{id}/approve`, `.../reject`, `GET /api/giving/programs/{id}/rollup` |
| **5** | `GET /api/giving/me/contributions` |
| **6** | Scoped program create + scope picker validation |
| **7** | Remove `/api/records`, legacy `Record` entity |

---

## UI (incremental)

| Phase | UI |
|-------|-----|
| **2** | Pastor: Programs list + create Rhapsody wizard |
| **3** | Cell leader: log contribution + screenshot upload |
| **4** | Fellowship leader: pending queue; Pastor: program drill-down dashboard |
| **5** | Member: My givings tab (replace placeholders in member detail) |
| **6** | Fellowship/PFCC leader: create scoped program |
| **7** | Remove legacy records UI if any |

---

## Implementation order

1. **Phase 2** — `GivingProgram` entity, migration, service, controller, pastor tests + UI  
2. **Phase 3** — `Contribution` + R2 attachment + cell leader UI  
3. **Phase 4** — Approval + rollup queries + dashboards  
4. **Phase 5** — Member my-givings  
5. **Phase 6** — Scoped program creation  
6. **Phase 7** — Delete legacy `Record` / `RecordsController`

Each phase: failing tests → review → implement → review → merge (dev migrates) → tag when ready for prod.

---

## Out of scope (unchanged from MVP spec)

Payments gateway, member self-submit, PFCC approval layer, batch approval, notifications, CEYC network admin.
