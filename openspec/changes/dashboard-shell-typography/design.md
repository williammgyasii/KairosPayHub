## Context

See proposal.md — Why. Today `index.css` has no custom `font-family`; the topbar is `h-14` with logo + church name + dual RoleBadge variants + bell + avatar packed with `gap-2`/`gap-3`. `DashboardPageHeader` already centralizes titles; topbar and many labels use `text-[11px]` / `text-[10px]`.

## Goals / Non-Goals

**Goals:**
- Shared type-role utilities + one UI font on `body`
- Topbar height/spacing/clusters + hide in-bar role on `<md`
- Apply scale to topbar + `DashboardPageHeader` (and keep role in account menu)

**Non-Goals:**
- Full redesign of every page/table/wizard to the new scale in this change
- Landing/marketing typography
- Changing sidebar nav structure

## Decisions

1. **Font: keep the prior system UI stack**  
   User preferred the original look; consistency comes from shared **sizes/roles**, not a new webfont. Source Sans 3 was tried and reverted.

2. **Type roles as Tailwind `@utility` / theme tokens**  
   Classes: `text-page-title`, `text-section-title`, `text-body`, `text-muted-body`, `text-eyebrow` mapping to existing visual sizes (≈ `text-2xl/3xl`, `text-lg`/`text-xl`, `text-sm`, `text-sm` muted, `text-xs` uppercase tracking). Prefer named roles over `text-[11px]`.  
   *Alt:* only document conventions — rejected; utilities enforce reuse.

3. **Topbar layout**  
   - Height `h-16`, horizontal padding `px-4 sm:px-6`, outer cluster gap `gap-4`  
   - Left: menu (lg:hidden) + brand/name (`lg:hidden` as today; desktop brand stays in sidebar)  
   - Right: RoleBadge full only `hidden md:flex` (remove compact topbar instance); spacer gap before notifications; avatar  
   - Compact RoleBadge remains in account dropdown header only  

4. **Tests**  
   Component tests for topbar: no compact badge in header; role still in menu; page header uses page-title class.

## Risks / Trade-offs

- [FOUT on first load] → Use `display=swap` on Google Fonts; fallback stack includes system-ui.  
- [Partial adoption leaves mixed sizes on deeper pages] → Spec scopes shell + page header; follow-up can migrate meta labels to `text-eyebrow`.

## Migration Plan

Ship with frontend deploy. No DB/API. Rollback = revert CSS/topbar/header commits.
