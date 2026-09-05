## Why

KairosPayHub defaults all giving amounts to **GHS**, but churches operate in many countries. Pastors need to pick their country during setup so totals, contributions, and dashboards use the correct currency from day one.

## What Changes

- Add **country** selection to pastor onboarding (church details step).
- Persist `CountryCode` (ISO 3166-1 alpha-2) and `DefaultCurrency` (ISO 4217) on the church tenant (`church_tenants`).
- Derive currency from country at onboarding time (pastor does not pick currency manually).
- Use the church default currency when logging contributions if none is supplied.
- Expose `countryCode` and `defaultCurrency` on `/api/me` and use them in frontend `formatAmount` defaults.
- Show selected country + currency on account/settings for pastors (read-only after onboarding for v1).

## Capabilities

### New Capabilities

- `onboarding/church-locale`: Country selection during church setup and persistence of country + default currency on the church tenant.

### Modified Capabilities

- `giving/contributions`: Default contribution currency comes from the church tenant instead of hard-coded GHS.

## Impact

- **API**: `OnboardRequest`, `OnboardingController`, `Domain.Structure.Church`, EF migration, `MeController`, `ContributionService`.
- **Frontend**: `OnboardingWizard`, `formatAmount`, pastor dashboard givings display, optional settings display.
- **Tests**: Onboarding integration tests, contribution currency default tests.
- **Data**: Existing churches remain on `GHS` until updated (migration backfill: null country, currency defaults unchanged).
