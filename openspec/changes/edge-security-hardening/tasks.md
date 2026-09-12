## 1. Lockout (TDD)

- [x] 1.1 Add failing integration test for 5 failed logins → lockout
- [x] 1.2 Configure Identity lockout + wire AccessFailedAsync in AuthService

## 2. Turnstile

- [x] 2.1 TurnstileVerifier + unit tests; wire Auth + Join controllers
- [x] 2.2 Frontend TurnstileField on login, signup, forgot-password, join

## 3. Gateway headers

- [x] 3.1 security-headers module + tests; wire index.ts

## 4. WAF + docs

- [x] 4.1 Terraform waf.tf (opt-in) + environments.md
- [x] 4.2 Run tests; restart dev servers
