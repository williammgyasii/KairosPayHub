## Why

Churches need the pastor to decide what each structure level may do (add a cell, see giving, add members). Today only pastor/admin can create units, and ChurchAdmin has the same church-wide powers as the pastor. Clients asked for in-church access control; Hilltop’s fellowship leader cannot add cells because create-unit is still pastor-only.

## What Changes

- Pastor-only **Access** item on the sidebar, route `/access`.
- A layer × ability grid: one row per template layer (labels from the template), plus an **Administrators** profile row, plus a named row per church administrator the pastor can tighten further.
- Defaults come from existing layer leadership profiles (church-wide / intermediate / leaf). The pastor’s saves are overlays, never a blank matrix.
- Intermediate leaders may create units on the **immediate child layer** inside their subtree when that ability is on. Leaf leaders cannot create units. Scope still blocks seeing another unit.
- **BREAKING** (API): `POST /api/structure/nodes` authorizes via the create-child-units ability and scope, not `RequireChurchManager` alone.
- Pastor cannot be limited. ChurchAdmin cannot open or edit Access. An admin cannot restore abilities the pastor turned off.

## Capabilities

### New Capabilities

- `auth/layer-access`: Church overlays on product abilities by structure layer, administrator profile, and named administrator; session `/me` and APIs honor them.
- `access/navigation`: Pastor-only Access sidebar item and `/access` route.

### Modified Capabilities

- `structure/unit-create`: Add unit follows layer-access (create child units + scope), not pastor/admin only.

## Impact

- API: overlay store, AbilityResolver overlay, create-node auth, Access GET/PUT (pastor-only).
- Frontend: sidebar + `PastorRoute` page; roster Add uses ability instead of `canManageChurch` / `readOnly`.
- Settings → Administrators stays people; Access is who may do what. No per-member ACL and no platform-operator control in this change.
