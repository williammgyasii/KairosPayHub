# KairosPayHub MVP Domain Spec

**Date:** 2026-08-07  
**Status:** Draft — pending review  
**Goal:** Replace the current flat Organization/Church/Leader/Record model with a church hierarchy, scoped giving programs, and member-visible contributions—without in-app payments.

---

## Problem statement

Churches (especially within networks like CEYC) track partnership giving (Rhapsody, Sunday service, special programs) through manual chains: members notify cell leaders, cell leaders pass records to fellowship leaders, fellowship leaders send money and records to the pastor. KairosPayHub should:

1. **Stop re-passing records** — enter once at the cell, roll up automatically.
2. **Keep money offline** — screenshots + amounts as proof; payment gateway later.
3. **Give the pastor a top-level view** with drill-down: PFCC → fellowship → cell → member.
4. **Let members log in** to view their own giving history (not create records).

---

## Core concepts

| Concept | Description |
|---------|-------------|
| **Church** | One local church (e.g. Naana’s church). Top tenant for MVP. |
| **Structure tree** | PFCC (optional) → Fellowship → Cell → Member placement. |
| **Giving program** | A container/campaign (e.g. “Rhapsody 2026”, “Sunday Service January”). |
| **Contribution** | One member’s gift inside a program (amount, date, screenshot). |
| **Scope** | Who may contribute into a program (church-wide vs fellowship vs PFCC vs selected fellowships). |

**Pastor always sees all programs and contributions** in the church. “Internal” scope means **who participates**, not hidden from pastor.

---

## Hierarchy (real world → model)

```text
Church
 └── PFCC (optional — some churches skip this)
      └── Fellowship (Wally)
           └── Cell (Josh)
                └── Member (Kay)
```

- **Member** belongs to exactly **one cell** (MVP).
- **Department** (one per member): out of MVP; add later.
- **Network (CEYC)** / partnership manager: out of MVP; add in phase 2.

---

## Roles and account provisioning

Rollout order when onboarding a church:

1. **Pastor** — church created; credentials set up.
2. **PFCC manager(s)** — if church uses PFCC; structure + leader accounts.
3. **Fellowship leaders** — accounts + fellowship assignment.
4. **Cell leaders** — accounts + cell assignment.
5. **Members** — accounts (invite-only); PFCC managers often create them; cell leaders maintain roster.

| Role | Create programs | Add contributions | Approve contributions | View |
|------|-----------------|-------------------|----------------------|------|
| **Pastor** | Church-wide only | No (MVP) | No (MVP) | Everything in church |
| **PFCC manager** | Scoped (same visibility rules as fellowship leader) | No (MVP) | TBD / optional | PFCC subtree + church-wide programs |
| **Fellowship leader** | Scoped (see below) | No (MVP) | Yes — contributions in fellowship | Fellowship subtree |
| **Cell leader** | No | **Yes — only role** | No | Own cell + programs in scope |
| **Member** | No | No | No | **Own contributions only** |

One person may hold multiple role assignments (e.g. cell leader who is also a member).

---

## Giving programs

### Church-wide programs (pastor only)

- **Creator:** Pastor only.
- **Example:** “Rhapsody 2026”.
- **Scope:** Entire church — all PFCCs, fellowships, cells, members may receive contributions (via cell leaders).
- **Rule:** Only one canonical church-wide instance per giving type/period (e.g. one “Rhapsody 2026” per church).

### Scoped programs (fellowship leader or PFCC manager)

- **Creator:** Fellowship leader or PFCC manager.
- **Examples:** “Sunday Service January”, “Fellowship Givings”.
- **Visibility** chosen at creation:

| `scope_kind` | Meaning |
|--------------|---------|
| `Fellowship` | Only one fellowship’s cells/members |
| `PFCC` | Entire PFCC — all fellowships down to members |
| `FellowshipGroup` | Selected fellowships within a PFCC (“team / sect”) |

Pastor sees these programs and full roll-ups regardless of scope.

### Program fields (conceptual)

```text
GivingProgram
  id, church_id
  giving_type          enum: Rhapsody, SundayService, SpecialProgram, FellowshipGiving, …
  title                e.g. "Rhapsody 2026", "Sunday Service January"
  period_label         e.g. "2026", "January 2026"
  scope_kind           ChurchWide | Fellowship | PFCC | FellowshipGroup
  scope_pfcc_id        nullable
  scope_fellowship_id  nullable (Fellowship scope)
  scope_fellowship_ids many-to-many (FellowshipGroup)
  status               Open | Closed
  created_by_user_id
  created_at
```

---

## Contributions

- **Only cell leaders** create contributions.
- **Members never create** — they view only.
- Flow: member notifies cell leader (WhatsApp/voice) → cell leader enters amount + **required screenshot**.

```text
Contribution
  id, program_id, member_id
  amount, currency (default GHS)
  date_sent
  attachment_id        screenshot (required for cell-leader entry)
  notes                optional ("paid to fellowship MoMo")
  entered_by_user_id   cell leader
  cell_id              denormalized from member for roll-up
  fellowship_id        denormalized
  pfcc_id              denormalized (nullable)
  status               PendingApproval | Approved | Rejected
  approved_by_user_id  fellowship leader (MVP)
  approved_at
  created_at
```

### Approval (MVP)

- Cell leader submits → **PendingApproval**.
- **Fellowship leader** approves or rejects contributions for members in their fellowship.
- Pastor dashboards use **Approved** contributions for official totals (may show pending counts separately).
- PFCC manager approval: defer unless church config requires it (phase 1.1).

### Member view

- Login → **My givings**: list/group by program, amount, date, status, optional thumbnail.
- No create/edit.

---

## Structure and membership

```text
StructureNode (optional explicit tree) OR fixed levels:

Pfcc
  id, church_id, name

Fellowship
  id, church_id, pfcc_id (nullable), name

Cell
  id, church_id, fellowship_id, name

Member
  id, church_id, cell_id
  auth_user_id         nullable until invite accepted
  name, phone, email
  created_at

RoleAssignment
  id, church_id, user_id (auth)
  role                 Pastor | PFCCManager | FellowshipLeader | CellLeader | Member
  scope_pfcc_id        nullable
  scope_fellowship_id  nullable
  scope_cell_id        nullable
```

**Member** links to auth account for login. **PFCC manager** creates member accounts; **cell leader** assigns/confirms cell roster.

---

## Permissions summary

### Cell leader (Josh)

- List members in assigned cell.
- List **open programs** where cell is in scope.
- Create contributions for cell members into those programs.
- Upload screenshot (required).

### Fellowship leader (Wally)

- Create scoped programs with visibility picker.
- Approve/reject pending contributions in fellowship.
- View fellowship roll-ups and notifications on new pending items.
- Cannot create church-wide Rhapsody (pastor only).

### Pastor (Naana)

- Create church-wide programs (Rhapsody 2026).
- Dashboard: totals per program; drill PFCC → fellowship → cell → member (+ screenshot).
- Manage leader invites / role assignments (MVP: basic invite flow).
- See all scoped programs regardless of visibility.

### Member (Kay)

- View own contributions only.

---

## Pastor dashboard (MVP UX)

1. **Program list** — Rhapsody 2026, Sunday Service January, … with church total (approved).
2. **Drill-down** on a program:
   - By PFCC (if any) → fellowship → cell → member.
   - For Fellowship-only programs, drill starts at fellowship level.
3. **Pending indicator** — count of contributions awaiting fellowship approval (optional widget).

---

## What we replace in the current codebase

| Current | MVP replacement |
|---------|-----------------|
| `Organization` | **`Church`** |
| `Church` (entity) | **`Fellowship` / `Cell`** or structure nodes |
| `User` + `Pastor`/`Leader` enum | **`RoleAssignment`** + **`Member`** profile |
| `Record` (flat) | **`GivingProgram`** + **`Contribution`** |
| Leader submits record | Cell leader adds **contribution** to **program** |
| Pastor verifies record | Fellowship leader **approves contribution** |
| No member entity | **`Member`** with view-only login |
| No attachments | **Screenshot** on every contribution |

Auth stays API-owned (ASP.NET Identity + JWT) — no change to auth architecture from prior spec.

---

## Out of MVP scope

- CEYC network / partnership manager superadmin
- Departments (one per member)
- Payment gateway / MoMo integration
- Member self-submit or magic link (cell leader remains data entry)
- PFCC manager approval layer (unless added in 1.1)
- Remittance tracking (“Wally sent ₵X to pastor on date Y”)
- Batch approval UI (single contribution approve is enough for v1)
- Email/in-app notifications (nice-to-have; fellowship leader can refresh list)

---

## Suggested implementation phases

| Phase | Deliverable |
|-------|-------------|
| **1** | Schema: Church, PFCC, Fellowship, Cell, Member, RoleAssignment |
| **2** | GivingProgram + scope rules + pastor creates Rhapsody |
| **3** | Contribution + screenshot storage + cell leader UI |
| **4** | Fellowship approval + pastor drill-down dashboard |
| **5** | Member login + “My givings” |
| **6** | Fellowship leader creates scoped programs + visibility picker |
| **7** | Migrate/remove old Organization/Record model |

Each phase should ship testable API + minimal UI; review before next phase.

---

## Open decisions (defaults chosen for MVP)

| Question | MVP default |
|----------|-------------|
| Who creates Rhapsody 2026? | Pastor only |
| Who adds member gifts? | Cell leader only |
| Who approves? | Fellowship leader |
| Member create records? | No — view only |
| Pastor sees internal PFCC/fellowship programs? | Yes — always |
| Screenshot required? | Yes — on every cell-leader contribution |
| Public signup? | No — invite only |

---

## References

- Prior auth spec: `docs/superpowers/specs/2026-08-07-api-auth-design.md`
- Current entities: `kairospayhub-api/src/KairosPayHub.Api/Domain/Entities.cs` (to be superseded)

---

## Approval

Review this spec before any schema migration or UI work. Comment on scope kinds, approval rules, or rollout roles; then implementation plans can be written per phase.
