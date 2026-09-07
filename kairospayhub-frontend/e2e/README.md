# Playwright E2E (layout / overflow smoke)

## Prerequisites
- API on http://localhost:5192
- Copy `e2e/env.example` → `.env.e2e.local` and set `PLAYWRIGHT_EMAIL` / `PLAYWRIGHT_PASSWORD`
- Chromium: `npx playwright install chromium`

## Run
```bash
npm run test:e2e
```

Asserts `documentElement.scrollWidth <= clientWidth` on home, givings list, and a campaign detail (dashboard + member/transactions tabs) at mobile, tablet, and desktop.

Optional: set `PLAYWRIGHT_PROGRAM_PATH=/givings/<id>` to pin a campaign.
