## 1. Persist setting (API)

- [x] 1.1 Add failing API tests: create root with `receiveGivingsOnMain` true/false; false without child rejected; false with child succeeds; contribution on root rejected when false; settings turn-off with directs requires move; verify tests fail
- [x] 1.2 Add `ReceiveGivingsOnMain` on `GivingProgram` (default true) + migration; expose on program DTOs; verify migration applies and existing rows read true
- [x] 1.3 Enforce on create (OFF requires ≥1 child in same flow/transaction), contribution create guard, and settings update with move-to-sub or create-sub-then-move; verify 1.1 tests pass

## 2. Policy manager (frontend)

- [x] 2.1 Add failing unit tests for receive-on-main policy (labels/help, canLogOnProgram for root vs sub, create requiresFirstSub when off); verify tests fail
- [x] 2.2 Implement `receiveGivingsOnMainPolicy` (or equivalent) with product copy “Receive givings on main campaign?” + help; verify 2.1 tests pass

## 3. Create campaign engine

- [x] 3.1 Add failing wizard tests: OFF blocks submit without a first sub; ON allows submit without sub; control uses the product label; verify tests fail
- [x] 3.2 Wire create-program form to the toggle + optional/required first-sub step and API payload; verify 3.1 tests pass

## 4. Campaign settings engine

- [x] 4.1 Add failing settings UI/API client tests: turn off with directs opens pick-or-create-sub migrate; turn on saves without migrate; verify tests fail
- [x] 4.2 Add root campaign Settings surface (toggle + migrate flow) and gate Log on main via policy ∧ acceptsContributions; verify 4.1 tests pass

## 5. Verification

- [x] 5.1 Run new API integration tests and frontend policy/wizard tests
- [x] 5.2 Restart local servers and smoke: create with OFF + required sub; create with ON; settings turn-off with migrate; Log hidden on main when off
