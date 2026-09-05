## 1. API — data model & locale map

- [x] 1.1 Add `CountryCode` and `DefaultCurrency` to `Domain.Structure.Church` and EF configuration
- [x] 1.2 Create migration for `church_tenants` columns; backfill existing rows with `DefaultCurrency = 'GHS'`
- [x] 1.3 Add `ChurchLocale` helper with supported country→currency map and validation
- [x] 1.4 Add `GET /api/onboarding/countries` returning `{ code, name, currency }[]`

## 2. API — onboarding & me

- [x] 2.1 Extend `OnboardRequest` with required `CountryCode`
- [x] 2.2 Apply country + derived currency in `OnboardingController.ApplyChurchProfile`
- [x] 2.3 Return `countryCode` and `defaultCurrency` from `/api/me` (onboarded + mid-onboarding)
- [x] 2.4 Integration tests: onboarding with CA→CAD, missing country rejected

## 3. API — giving

- [x] 3.1 Resolve contribution currency from church default when input currency is empty
- [x] 3.2 Integration test: church with CAD default stores CAD on new contribution

## 4. Frontend — onboarding

- [x] 4.1 Fetch countries list on onboarding church-details step
- [x] 4.2 Add required country `<Select>` with currency preview
- [x] 4.3 POST `countryCode` to `/api/onboarding`
- [x] 4.4 Extend `MeNotOnboarded` / `Me` types with locale fields

## 5. Frontend — display

- [x] 5.1 Use church `defaultCurrency` in `formatAmount` across givings dashboard and contribution UI
- [x] 5.2 Show country + currency read-only on pastor settings/account (optional polish)

## 6. Verify

- [x] 6.1 Run API integration tests for onboarding + contributions
- [ ] 6.2 Manual smoke: new church in Canada → dashboard shows CAD amounts
- [x] 6.3 Restart dev servers
