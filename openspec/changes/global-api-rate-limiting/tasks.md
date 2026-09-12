## 1. Policy manager (TDD)

- [x] 1.1 Add Vitest to `cloudflare/api` and write failing tests for path classification, keys, and skip rules (`rate-limit-policy.test.ts`)
- [x] 1.2 Implement `rate-limit-policy.ts` to pass tests

## 2. Gateway engine

- [x] 2.1 Add Rate Limiting bindings to `wrangler.jsonc` (auth, join, api, hubs)
- [x] 2.2 Implement `rate-limit.ts` engine and wire into `index.ts`
- [x] 2.3 Extend `env.ts` with binding types

## 3. Docs and verify

- [x] 3.1 Document limits in `infra/environments.md`
- [x] 3.2 Run `npm test` in `cloudflare/api`; restart local dev servers

## 4. CI and deploy

- [x] 4.1 Add `gateway` job to `.github/workflows/ci.yml` (vitest on policy manager)
- [x] 4.2 Deploy gateway to dev (`wrangler deploy --env development`)
- [x] 4.3 Smoke test dev: `/health`, login page load, no 429 on normal traffic
