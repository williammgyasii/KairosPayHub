## Why

The four projects exist, but Api still hosts every service, DTO, and ability resolver. Finishing the conversion means the web host is HTTP-only; use-case I/O and policy types live in Application; EF-backed services live in Infrastructure.

## What Changes

- Move `Web/Contracts.cs` and `Authorization/` into Application (same namespaces).
- Move remaining `Services/` (except SignalR, which needs the hub) into Infrastructure.
- Register those services from Infrastructure / Application DI. Program keeps JWT, CurrentActor, and the SignalR publisher.
- No HTTP contract change. Existing tests remain the lock.

This completes the project boundary. Peeling each service method into its own handler (like `DeleteStructureTemplate`) is follow-up, not this slice.

## Capabilities

- (none — `skip_specs: true`)

## Impact

- Application, Infrastructure, Api `Program.cs`
- Tests keep compiling against the same namespaces
