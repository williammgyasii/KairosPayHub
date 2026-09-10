## 1. Application project + handler policy

- [x] 1.1 Add `KairosPayHub.Application` (Domain only); list in slnx; copy csproj in Dockerfile restore; Api and Tests reference it
- [x] 1.2 Move `NotOnboardedException` to Domain
- [x] 1.3 Add failing handler tests: cell leader is forbidden; pastor with no church is not onboarded; pastor/church admin calls reset with that church id
- [x] 1.4 Implement `DeleteStructureTemplate` + `IChurchOperationalReset`; verify handler tests pass

## 2. Adapter + HTTP wiring

- [x] 2.1 Move wipe SQL from `StructureService.DeleteTemplateAsync` into `EfChurchOperationalReset`
- [x] 2.2 Wire DI; controller calls the use case; remove the service method
- [x] 2.3 Existing wipe + leader-reuse API tests still pass
