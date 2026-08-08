# KairosPayHub MVP Domain Spec

**Date:** 2026-08-07  
**Status:** Draft — pending review  
**Goal:** Replace the current flat Organization/Church/Leader/Record model with a church hierarchy, scoped giving programs, and member-visible contributions—without in-app payments.

---

## Problem statement

Churches (especially within networks like CEYC) track partnership giving (Rhapsody, Sunday service, special programs) through manual chains: members notify cell leaders, cell leaders pass records to fellowship leaders, fellowship leaders send money and records to the pastor. KairosPayHub should:

1. **Stop re-passing records** — enter once at the cell, roll up automatically.
2. **Keep money offline** — screenshots + amounts as proof; payment gateway later.
3. **Give the pastor a top-level view** with drill-down following **that church’s defined layer chain** down to member.
4. **Let members log in** to view their own giving history (not create records).

---

## Core concepts

| Concept | Description |
|---------|-------------|
| **Church** | One local church (e.g. Naana’s church). Top tenant for MVP. |
| **Structure template** | Pastor-defined ordered chain of org layers under Church (e.g. PFCC → Fellowship → Cell, or Group → PFCC → Fellowship → Cell). **Member is always the leaf** — not part of the template. |
| **Structure tree** | Instances of each layer + members placed on the deepest org layer. |
| **Giving program** | A container/campaign (e.g. “Rhapsody 2026”, “Sunday Service January”). |
| **Contribution** | One member’s gift inside a program (amount, date, screenshot). |
| **Scope** | Who may contribute into a program (church-wide vs fellowship vs PFCC vs selected fellowships). |

**Pastor always sees all programs and contributions** in the church. “Internal” scope means **who participates**, not hidden from pastor.

---

## Hierarchy (real world → model)

**Church is always the root.** Before adding fellowships, cells, or people, the **pastor defines the org layer chain** for that church. Everything else hangs under that chain.

### Two churches, two chains

```text
Church A template:  PFCC → Fellowship → Cell → Member (leaf)
Church B template:  Group → PFCC → Fellowship → Cell → Member (leaf)
```

- **Member** is always the **last** level — people, not an org layer in the template.
- **Member** belongs to exactly **one parent node** on the **deepest org layer** (usually “Cell”) (MVP).
- Layers use **standard types** from a fixed vocabulary and/or **custom display names** (e.g. standard `Group` labeled “Sect”).
- After the template is saved, the pastor **creates instances** under each layer (e.g. three PFCCs, then fellowships under each PFCC).

### Standard layer vocabulary (MVP)

| Standard type | Typical role scope (later) |
|---------------|----------------------------|
| `Group` | Group leader (future) |
| `PFCC` | PFCC manager |
| `Fellowship` | Fellowship leader |
| `Cell` | Cell leader |

Pastor picks an **ordered subset** of these (and order matters). Custom **labels** are allowed per layer (e.g. display “Sect” while standard type remains `Group` for permissions).

**Presets (shortcuts, not separate products):**

| Preset | Layers (org only, before Member) |
|--------|----------------------------------|
| Standard | PFCC → Fellowship → Cell |
| With groups | Group → PFCC → Fellowship → Cell |
| Flat | Fellowship → Cell |

### Conceptual model

```text
Church
 └── StructureTemplate (one per church; pastor sets once)
      └── StructureLayer[]   ordered; standard_type + display_name
 └── StructureNode[]        instances; parent → child follows template order
      └── Member[]          always leaf; parent = node on deepest org layer
```

Example instances for Church A:

```text
Church (Naana’s)
 └── PFCC · North
      └── Fellowship · Wally
           └── Cell · Josh
                └── Member · Kay
```

- **Department** (one per member): out of MVP; add later.
- **Network (CEYC)** / partnership manager: out of MVP; add in phase 2.

### Setup flow (UX)

1. **Define chain** — pastor chooses preset or builds ordered layers (fixed types + optional custom labels).
2. **Populate tree** — add nodes layer by layer (PFCCs, then fellowships under each PFCC, etc.). **Every org unit has a head** (leader) when created — see [Evolvable structure](#evolvable-structure).
3. **Add members** — always on the deepest org layer only.

Dashboard drill-down and giving roll-ups follow **that church’s layer order**, not a hard-coded PFCC-first path.

### One-way chain (MVP)

Structure is **one-way**: Church → layer₀ → layer₁ → … → deepest layer → Member (leaf).

- Parent links always follow **template sort order** (a node’s parent is on the previous layer, or church for layer₀).
- **Members never parent org nodes**; org nodes never parent church.
- Wizards, roster tabs, and roll-ups derive steps/columns from `getLayers(template)` — not hard-coded PFCC/Fellowship/Cell names.

**Later version (not MVP):** “two-way” structure editing — remove or reorder layers, collapse subtrees, undo migrations. MVP only supports **append** and **insert** with an explicit migration preview.

---

## Evolvable structure

Pastors may need to **append** or **insert** org layers after roster data exists (e.g. add `Group` on top, or insert `Zone` between PFCC and Fellowship). The system must adapt wizards, roster, and membership without a full reset.

### Allowed template changes (with roster present)

| Change | MVP | Migration |
|--------|-----|-----------|
| Edit template / layer **display names** | Yes | None |
| **Append** layer at top (new layer₀; old layer₀ becomes layer₁) | Yes | Re-parent: each old layer₀ node becomes child of a new auto-created layer₀ node under church |
| **Append** layer before Member (new deepest layer) | Yes | Re-parent: each member’s current parent becomes child of a new deepest node; member attaches to new deepest |
| **Insert** layer between existing layers | Yes | Auto-bridge (default) — see below |
| Remove layer | No | Deferred (two-way / later version) |
| Reorder layers | No | Deferred (two-way / later version) |

### Insert-in-middle — auto-bridge (default)

When pastor inserts layer **B** between **A** and **C**:

```text
Before:  A (PFCC 1) → C (Fellowship X) → …
After:   A (PFCC 1) → B (Zone 1) → C (Fellowship X) → …
```

**Default migration:** for each node on layer **A**, create one new **B** node (e.g. “Zone 1” under PFCC 1) and re-parent all former **A→C** children to that **B** node. Pastor renames or splits zones afterward.

Pastor must confirm a **dry-run preview** before apply (counts: nodes created, nodes re-parented, members unchanged).

Optional later: manual mapping wizard when auto-bridge is wrong (one PFCC, many fellowships, pastor wants several zones).

### Every org unit has a head

**Rule:** every `StructureNode` has exactly one **head** (leader member) once the unit is fully set up.

- Stored as `leader_member_id` on the node; role derived from layer `standard_type` (PFCC manager, fellowship leader, cell leader, etc.).
- Create wizards: **unit details → head (leader)** at minimum; deeper layers may add “first child unit” steps when the next layer exists below.
- “No leader yet” is not a long-term state — only allowed as a transient draft before the wizard completes (remove “optional no leader” from roster create flows over time).

Members are not “heads” of org layers; they are leaves. A person may be head of a cell **and** a member on that same cell.

### UI / API principles (implementation)

1. **Never hard-code layer count or names** in wizards — use template order and `displayName`.
2. **Deepest layer** = member placement layer (`getDeepestLayer`).
3. **Child layer** = `sortOrder + 1`; **parent layer** = `sortOrder - 1`.
4. Template mutation runs in a **single transaction** with validation: no orphan nodes, no members on non-deepest layers after migration.
5. Current MVP lock (`Structure template cannot change after nodes exist`) is **temporary** until insert/append migration API ships.

### Suggested delivery order

1. Spec + integration tests for `POST /api/structure/template/evolve` (dry-run + apply).
2. Unlock safe edits (display names).
3. Append-top + insert-middle with auto-bridge preview UI.
4. Refactor fellowship/cell wizards → generic layer-position wizards.
5. Require head on all create flows; dashboard uses deepest layer, not `standardType === 'Cell'`.

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

**Replaces fixed `Pfcc` / `Fellowship` / `Cell` tables** with template + generic nodes (migration from current Phase 1 schema).

```text
StructureTemplate
  id, church_id
  created_at, locked_at          optional — lock after first population

StructureLayer
  id, template_id
  sort_order                     0 = first layer under church
  standard_type                  Group | PFCC | Fellowship | Cell
  display_name                   e.g. "PFCC", "Sect", "Zone"

StructureNode
  id, church_id, layer_id
  parent_node_id                 null → parent is church (first layer only)
  name
  unit_number                    optional sequential label among siblings
  leader_member_id               head of this unit (required once setup complete)

Member
  id, church_id
  parent_node_id                 must reference node on deepest org layer
  auth_user_id                   nullable until invite accepted
  name, phone, email
  created_at

RoleAssignment
  id, church_id, user_id (auth)
  role                           Pastor | PFCCManager | FellowshipLeader | CellLeader | Member
  scope_node_id                  node at appropriate layer for role
```

**Member** links to auth account for login. Leaders are scoped to **structure nodes** at the layer matching their role’s standard type.

### Current codebase gap

Template-first **StructureNode** + wizards exist, but:

- Template is **locked** after any roster node exists (needs evolve API).
- Some UI still branches on `standardType === 'Fellowship' | 'Cell'` instead of layer position.
- Leader can still be skipped on generic unit create — should converge on **every unit has a head**.
- Dashboard metrics still assume a `Cell` layer by standard type.

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
| **1a** | *(done — to refactor)* Fixed PFCC / Fellowship / Cell / Member schema + CRUD |
| **1b** | **Structure template:** pastor defines layer chain; generic `StructureNode`; migrate existing data |
| **1c** | **Evolvable structure:** append/insert layers with auto-bridge migration; generic wizards; required head on every unit |
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
| Change structure after roster exists? | **Append** or **insert** only (with migration preview); remove/reorder later |
| Insert layer between existing layers? | Yes — **auto-bridge** default (one new parent node per ancestor) |
| Every org unit has a leader? | **Yes** — every structure node has a head |
| Structure direction | **One-way** chain (Church → layers → member); two-way edit deferred |

---

## References

- Prior auth spec: `docs/superpowers/specs/2026-08-07-api-auth-design.md`
- Current entities: `kairospayhub-api/src/KairosPayHub.Api/Domain/Entities.cs` (to be superseded)

---

## Approval

Review this spec before any schema migration or UI work. Comment on scope kinds, approval rules, or rollout roles; then implementation plans can be written per phase.
