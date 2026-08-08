# Structure Node Canvas — Design Spec

**Date:** 2026-08-07  
**Status:** Superseded — see `2026-08-07-mvp-domain-design.md` (configurable structure template). Canvas may return as a view over generic nodes later.
**Scope:** Overview + Structure page builder UI; link/reparent API

---

## Goal

Replace the linear structure checklist with a **React Flow node canvas** where pastors:

1. See **Church** as the root node (always present)
2. Add **PFCC**, **Fellowship**, **Cell**, **Member** nodes from a palette
3. **Draw connections** (edges) to define hierarchy
4. Persist links via API on connect (create or PATCH)

## Valid connections

| Source | Target | Effect |
|--------|--------|--------|
| Church | PFCC | Visual only (PFCC belongs to church implicitly) |
| Church | Fellowship | `fellowship.pfccId = null` |
| PFCC | Fellowship | `fellowship.pfccId = pfcc.id` |
| Fellowship | Cell | `cell.fellowshipId = fellowship.id` |
| Cell | Member | `member.cellId = cell.id` |

Invalid edges are rejected in UI and API.

## Node lifecycle

1. **Palette add** — creates a local *pending* node (client UUID, prompt for name)
2. **Connect to parent** — POST create with parent id, or PATCH if node already persisted
3. **Reconnect edge** — PATCH link endpoint updates parent reference
4. **Layout** — node `x/y` stored in `localStorage` per church (MVP); not in DB

## API additions

```
PATCH /api/structure/fellowships/{id}/link  { pfccId: guid | null }
PATCH /api/structure/cells/{id}/link        { fellowshipId: guid }
PATCH /api/structure/members/{id}/link      { cellId: guid }
```

Pastor-only; all targets must belong to actor's church.

## UI layout

- **Left palette:** + PFCC, + Fellowship, + Cell, + Member; “Skip PFCC” hint
- **Center:** React Flow canvas with custom minimal nodes (no card chrome)
- **Overview:** canvas is primary; metrics hidden until Fellowship → Cell → Member chain exists

## Dependencies

- `@xyflow/react` — node canvas
- Existing POST create endpoints for persist-on-connect

## Out of scope (later)

- Delete nodes
- Leader account assignment from canvas
- Persisted layout coordinates in DB
- Mobile-optimized canvas (desktop-first for MVP)
