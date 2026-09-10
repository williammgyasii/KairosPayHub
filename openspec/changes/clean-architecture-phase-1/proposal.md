## Why

The API is one ASP.NET project. Phase 1 of Clean Architecture is a Domain library so entities no longer live inside the web host. No product behavior changes.

## What Changes

- Add `KairosPayHub.Domain` (class library, no EF / HTTP packages).
- Move `Domain/**` entities there. Keep `KairosPayHub.Api.Domain` namespaces so this slice is a project boundary only.
- Api references Domain. Dockerfile restore copies the Domain csproj. Solution lists Domain.

## Capabilities

### New Capabilities

- (none — `skip_specs: true`)

### Modified Capabilities

- (none)

## Impact

- `kairospayhub-api/src/KairosPayHub.Domain`
- `KairosPayHub.Api.csproj`, `KairosPayHub.slnx`, `Dockerfile`
- Build + existing tests. No API contract change.
