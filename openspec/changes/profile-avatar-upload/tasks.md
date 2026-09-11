## 1. Spec & API tests

- [x] 1.1 Add API integration tests for `POST /api/me/avatar` (success, replace, bad file, storage 503) and `GET /api/me` `avatarUrl`
- [x] 1.2 Add frontend tests: Profile shows avatar upload; topbar shows image when `avatarUrl` set

## 2. API

- [x] 2.1 Add `AvatarUrl` to `ApplicationUser` + EF migration
- [x] 2.2 Implement `UserAvatarService` (validate + R2 upload + persist)
- [x] 2.3 Add `POST /api/me/avatar` and include `avatarUrl` on `GET /api/me`
- [x] 2.4 Register service in DI; make API tests green

## 3. Frontend

- [x] 3.1 Extend `Me` with `avatarUrl`; wire upload helper
- [x] 3.2 Profile page avatar preview + upload/replace
- [x] 3.3 Topbar `AvatarImage` from `me.avatarUrl`
- [x] 3.4 Make frontend tests green

## 4. Verify

- [x] 4.1 Run relevant API + FE tests; restart dev servers
