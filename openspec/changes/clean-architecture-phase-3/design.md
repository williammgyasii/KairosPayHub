## Boundary

```
KairosPayHub.Domain
        ^
KairosPayHub.Application     use cases + ports (no EF)
        ^
KairosPayHub.Infrastructure  KairosDbContext, email, R2, EF adapters
        ^
KairosPayHub.Api             HTTP, CurrentActor, remaining services
```

Infrastructure references Domain + Application (it implements ports).
Api references all three. Application never references Infrastructure.

## What moves

- `Data/` (context + migrations), `Email/`, `Storage/`
- Identity entities used by the context (`ApplicationUser`, tokens)
- `ChurchReadCache`, `EfChurchOperationalReset`, connection-string normalize
- Persistence package references (EF, Npgsql, MailKit, S3)

`CurrentActor` stays in Api (HTTP claims). JwtBearer stays in Api.

## What this is not

Moving a service class into Infrastructure is not a use-case extraction. Structure, giving, and attendance still become Application commands in later slices, with ports this project implements.
