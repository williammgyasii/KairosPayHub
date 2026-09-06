# Documentation

How we keep KairosPayHub understandable as the product grows.

## What goes where

| Location | Use for |
|----------|---------|
| [`openspec/changes/`](../openspec/changes/) | **Active features** — proposal, WHEN/THEN specs, design, tasks. Prefer this before coding user-facing behavior. |
| [`openspec/specs/`](../openspec/specs/) | **Archived / canonical** behavior after a change is archived |
| [`docs/superpowers/specs/`](./superpowers/specs/) | Deeper architecture / historical design notes |
| [`infra/environments.md`](../infra/environments.md) | Deploy URLs, secrets, Cloudflare/Neon operators |
| [`infra/terraform/`](../infra/terraform/) | Account-level Cloudflare infra as code |
| Root [`README.md`](../README.md) | Project overview for humans and GitHub |

## Working loop (features)

1. Propose or update an OpenSpec change (`openspec/changes/<name>/`).
2. Encode behavior in `specs/**/spec.md` (WHEN/THEN).
3. Write failing tests, then implement.
4. Mark tasks in `tasks.md`; archive when done.

Implementation details belong in `design.md`, not in specs.

## Environments (quick)

- **Dev:** https://dev.app.kairospayhub.com — deploy on green CI to `main`
- **Prod:** https://app.kairospayhub.com — deploy on `v*` tags / [Releases](https://github.com/williammgyasii/KairosPayHub/releases)

See [`infra/environments.md`](../infra/environments.md) for the full runbook.
