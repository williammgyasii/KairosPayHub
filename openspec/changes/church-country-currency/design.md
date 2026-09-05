## Context

See `proposal.md`. Today:

- `church_tenants` stores name, location, pastor profile fields — no country or currency.
- Contributions default to `"GHS"` in `ContributionService` and DB column defaults.
- Frontend `formatAmount()` defaults to `GHS`.
- Onboarding wizard collects church name, free-text location, pastor name, member count.

## Goals / Non-Goals

**Goals:**

- Add `CountryCode` + `DefaultCurrency` to `Domain.Structure.Church` / `church_tenants`.
- Country dropdown on onboarding step 2; currency derived server-side (not user-editable in v1).
- API validation via curated country→currency map shared by API (source of truth).
- Use church currency for new contributions and frontend formatting when available.

**Non-Goals:**

- Multi-currency per church or per-campaign overrides.
- Changing currency after onboarding (settings UI) — defer to a follow-up change.
- FX conversion between currencies.
- Replacing free-text `Location` with structured address fields.

## Decisions

### 1. Store both country and currency on the church tenant

**Decision:** Persist `CountryCode` (char 2) and `DefaultCurrency` (char 3) on `church_tenants`.

**Rationale:** Country is what pastors understand; currency is what giving math needs. Storing both avoids re-deriving currency on every read and supports future “change country” settings.

**Alternative considered:** Derive currency only at runtime from country — rejected because contributions and `/api/me` need fast access without repeated lookup logic.

### 2. Server-side country→currency map (curated list)

**Decision:** Add `ChurchLocale` static helper in API with ~20–30 supported countries (GH, US, CA, GB, NG, KE, ZA, etc.) mapping to ISO 4217 codes. Expose `GET /api/onboarding/countries` for the frontend dropdown (code, name, currency).

**Rationale:** Predictable validation; avoids shipping all 200+ countries before we need them; Ghana diaspora + North America + common African markets covered first.

**Alternative considered:** Full ISO list via library — deferred; can expand map later without schema change.

### 3. Onboarding UI: country select replaces implicit GHS

**Decision:** Add required `<Select>` for country on church details step. Show read-only preview: “Currency: CAD” after selection (computed client-side from same map exported to frontend or returned by countries endpoint).

**Rationale:** Pastor confirms country; currency is transparent but not editable.

### 4. Contribution default resolution order

**Decision:** `input.Currency` if non-empty → else church `DefaultCurrency` → else `"GHS"`.

**Rationale:** Backward compatible for existing tenants and explicit overrides.

### 5. Frontend formatting

**Decision:** Extend `Me` type with `defaultCurrency`; update `formatAmount(amount, currency?)` callers on dashboard/givings to pass `me.defaultCurrency ?? 'GHS'`.

## Risks / Trade-offs

- **[Risk] Existing prod churches stay on GHS** → Acceptable; migration sets `DefaultCurrency = 'GHS'` where null. Columbus (US) would need a manual update or settings follow-up.
- **[Risk] Country/currency map drift between FE and BE** → Mitigation: FE loads countries from API endpoint only; no duplicated map in frontend long-term.
- **[Risk] Free-text location redundant with country** → Keep location field for city/state detail; country is separate.

## Migration Plan

1. EF migration: add nullable `CountryCode`, `DefaultCurrency` (default `'GHS'`) to `church_tenants`.
2. Backfill: leave `CountryCode` null; set `DefaultCurrency = 'GHS'` for existing rows.
3. Deploy API + frontend together.
4. Rollback: new columns nullable; old code ignores them.

## Open Questions

- Should pastors be able to change country in Settings in v1.1? (Deferred — read-only display on account/branding for now.)
