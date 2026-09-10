## Why

Phase 2 put one use case in Application, but EF, SMTP, and R2 still live in the web host. The four-project shape is incomplete until persistence has its own assembly.

## What Changes

- Add `KairosPayHub.Infrastructure` (EF, Identity store, email, R2, wipe adapter).
- Keep namespaces (`KairosPayHub.Api.Data`, `.Email`, `.Storage`, `.Auth`) so this slice is a project boundary only.
- Api `Program.cs` calls `AddKairosInfrastructure` / `AddKairosApplication`. Controllers and remaining services stay in Api.
- No HTTP or wipe behavior change. Existing tests remain the lock.

## Capabilities

### New Capabilities

- (none — `skip_specs: true`)

### Modified Capabilities

- (none)

## Impact

- `kairospayhub-api/src/KairosPayHub.Infrastructure`
- Api / Tests / slnx / Dockerfile
- Later slices extract remaining services into Application against ports implemented here
