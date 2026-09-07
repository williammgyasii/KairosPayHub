# KairosPayHub

**Multi-tenant church management platform** for giving, attendance, and organizational structure — built end-to-end from product specs through production on Cloudflare.

Live: [app.kairospayhub.com](https://app.kairospayhub.com) · Staging: [dev.app.kairospayhub.com](https://dev.app.kairospayhub.com)

---

## Overview

KairosPayHub helps churches run day-to-day operations in one place: logging and approving contributions, marking attendance with structure-aware workflows, and managing roster hierarchy (PFCC → fellowship → cell). Access is role-scoped so pastors, mid-level leaders, and cell leaders each see the right surface — not a one-size-fits-all admin panel.

The product is **spec-driven** (OpenSpec proposals with WHEN/THEN scenarios), **test-backed**, and deployed with a clear promotion path: merge to `main` ships development; version tags ship production.

---

## What it does

### Giving
- Campaigns and nested sub-givings with structure-aware scopes
- Batch contribution logging and pastor/leader approval queues
- Member rankings and campaign transaction views with filterable, column-toggled tables
- Realtime refresh when approvals change

### Attendance
- Meeting types with church timezone windows and “always open” options
- **Submission layer** per meeting (e.g. start at Cell vs Fellowship) so roll-call sheets match the church’s structure template
- Mark-attendance wizard: pick meeting/date → roll call (click present / double-click absent)
- **One-hop parent approval** — e.g. cell submits, fellowship leader approves; pastors use metrics, not a bottleneck approval queue
- Metrics: Who showed up, By unit (nested counts by fellowship/cell), Yet to submit

### Structure & roster
- Configurable church structure templates and unit leadership
- Dual-hatted leaders can pick which unit they’re acting for
- Ability-based UI gating alongside roles

---

## Tech stack

| Layer | Choices |
|-------|---------|
| Frontend | React, Vite, TypeScript, Redux Toolkit Query, TanStack Table |
| Backend | .NET 10, EF Core, PostgreSQL (Neon) |
| Realtime | SignalR |
| Auth / tenancy | JWT, church-scoped multi-tenancy |
| Infra | Cloudflare Workers + Containers (API gateway), Pages (SPA), R2, DNS |
| Delivery | GitHub Actions — CI, env deploys, releases; Terraform scaffold for account infra |
| Process | OpenSpec (proposal → specs → tasks), TDD for non-trivial behavior |

---

## Architecture highlights

- **Same-origin gateway:** one hostname proxies `/api`, `/auth`, `/hubs` to the .NET container and serves the SPA for everything else.
- **Environments:** development on push to `main`; production on `v*` tags with GitHub Releases.
- **Structure-aware domain:** attendance and giving follow the church’s template layers rather than hard-coded “cell only” assumptions.
- **Operator docs:** README, environment runbook, and living OpenSpec change history.

---

## Role on the project

Sole builder / owner: product design, OpenSpec requirements, API and frontend implementation, tests, Cloudflare deployment, release tagging, and portfolio/docs polish.

---

## Suggested resume bullets

- Designed and shipped a multi-tenant church SaaS (giving, attendance, roster) on .NET, React, Neon Postgres, and Cloudflare Workers/Pages.
- Built structure-aware attendance: configurable submission layers, one-hop leader approval, timezone-aware meeting windows, and tabbed metrics with hierarchical unit rollups.
- Implemented giving workflows with campaigns, batch entry, approval queues, and in-depth member/campaign analytics tables.
- Established spec-driven delivery (OpenSpec + TDD) and a GitHub Actions pipeline (CI → staging on `main`, production on version tags) with Terraform for Cloudflare account infra.

---

## Links

- Production: https://app.kairospayhub.com  
- Staging: https://dev.app.kairospayhub.com  
- Releases: versioned on GitHub (`v0.7.x` and earlier)
