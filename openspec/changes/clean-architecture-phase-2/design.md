## Boundary

```
DeleteStructureTemplate          Application (who / which church)
    → IChurchOperationalReset    port
        → EfChurchOperationalReset   Api adapter (SQL wipe)
```

Application answers policy from `Actor` (pastor / church admin, church id present). It never sees `KairosDbContext`.

The adapter owns delete order (giving/attendance before members/nodes). That is persistence, not product policy.

## Why this command first

`DeleteTemplate` is already locked by integration tests. If the extraction changes behavior, those fail. We do not extract the rest of `StructureService` in this slice.

## Exceptions

`NotOnboardedException` moves next to `ForbiddenException` / `BadRequestException` in Domain so Application can throw it without referencing Auth.
