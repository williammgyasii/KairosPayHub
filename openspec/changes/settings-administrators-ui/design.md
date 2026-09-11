## Context

See proposal.md. Current page: side-by-side form + always-visible table; useState form fields; affiliation toggles with InChurch disabled.

## Goals / Non-Goals

**Goals:** Stacked RHF form + collapsible active-only table; cleaner affiliation enum usage.

**Non-Goals:** In-church member picker; inactive-admin archive UI; changing `AppUsers.Role = Pastor` legacy row for admins (out of scope unless product asks).

## Decisions

1. **Layout** — vertical stack, not xl two-column.
2. **Collapse** — `useState` + button header (no new dependency); default `open = true`.
3. **Active filter** — client filter `admins.filter(a => a.isActive)` (API already returns all).
4. **Affiliation** — FE constants from typed union; BE parse enum once at start of create.

## Risks / Trade-offs

- [InChurch still disabled] → Keep disabled + title until member linking ships.
