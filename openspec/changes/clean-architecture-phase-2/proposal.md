## Why

Phase 1 put entities in Domain. Use cases still live in `StructureService` next to EF. The first Application slice is one command so we learn the boundary before moving the rest of the API.

## What Changes

- Add `KairosPayHub.Application` (class library, Domain only — no EF / HTTP).
- Extract `DELETE /api/structure/template` into `DeleteStructureTemplate` + `IChurchOperationalReset`.
- Keep the EF wipe in an Api adapter (`EfChurchOperationalReset`). Infrastructure as its own project comes later.
- HTTP contract and wipe behavior stay the same. Existing wipe tests remain the lock.

## Capabilities

### New Capabilities

- (none — `skip_specs: true`)

### Modified Capabilities

- (none)

## Impact

- `kairospayhub-api/src/KairosPayHub.Application`
- Api adapter + DI + controller wiring
- `KairosPayHub.slnx`, Dockerfile restore layer
- Application unit tests + existing structure wipe / leader-reuse tests
