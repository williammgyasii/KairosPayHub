## 1. Domain project

- [x] 1.1 Add `KairosPayHub.Domain` class library with no EF or HTTP packages
- [x] 1.2 Move `Api/Domain/**` into Domain; keep `KairosPayHub.Api.Domain` namespaces
- [x] 1.3 Reference Domain from Api and Tests; list it in `KairosPayHub.slnx`; copy Domain csproj in the Dockerfile restore layer
- [x] 1.4 `dotnet build` + a short API test filter pass; restart local servers
