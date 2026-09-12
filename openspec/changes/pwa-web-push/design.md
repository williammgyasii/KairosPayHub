## Context

See proposal.md. Today `NotificationEngine.DeliverAsync` persists inbox rows and `SignalRNotificationPublisher` fans them to open tabs. Account → Notifications already says “Email and push preferences are coming soon.” There is no manifest beyond `theme-color`, no service worker, and no subscription table.

iOS 16.4+ only delivers Web Push after Add to Home Screen. Recipients stay in `NotificationRecipientResolver` / the gateway — this change adds a pipe, not a second “who?” engine.

## Goals / Non-Goals

**Goals:**

- Installable PWA (manifest + thin service worker).
- Store VAPID subscriptions per auth user; send on the existing `DeliverAsync` path.
- Account toggle to enable/disable; iOS gets an Add to Home Screen hint.

**Non-Goals:**

- Capacitor / App Store / Play Store.
- Bottom-tab mobile shell.
- Email, SMS, or per-kind mute lists.
- Offline-first caching of API data.
- Changing recipient policy or `NotificationKind` values.

## Decisions

### 1. Thin service worker for push, not a full Workbox precache

A custom SW that handles `push` + `notificationclick` and claims clients. Do **not** adopt `vite-plugin-pwa` precaching for this swallow — Cloudflare Pages deploys would fight a hashed precache and serve stale shells.

**Alternative:** `vite-plugin-pwa` with generateSW. Faster install criteria, higher stale-deploy risk. Revisit only if we later want offline.

### 2. Second publisher on the engine, not a second recipient pass

`NotificationEngine` already loops recipients once. After persist + SignalR, call a `WebPushPublisher` with the same DTOs. Composers (`NotificationService`, `MeetingTypeNotificationService`) stay unaware.

**Alternative:** send from the Cloudflare gateway Worker. Rejected — the engine already has the rows and recipient ids; the container is the source of truth.

### 3. Subscriptions table keyed by endpoint

`PushSubscription`: `Id`, `AuthUserId`, `ChurchId`, `Endpoint` (unique), `P256dh`, `Auth`, `UserAgent?`, `CreatedAt`, `LastSeenAt`. Upsert on register. Delete on disable or HTTP 404/410 from the push service.

Public VAPID key via `GET /api/notifications/push/vapid-key`. Register/unregister via `PUT` / `DELETE /api/notifications/push/subscriptions`.

### 4. Send even if a tab is open

First swallow sends OS push whenever a subscription exists. The bell still updates via SignalR. Duplicate toast while a tab is focused is acceptable; suppress-if-connected can come later without changing the spec.

**Alternative:** skip Web Push when SignalR has that user in a group. Fewer toasts, more state. Deferred.

### 5. Missing VAPID config skips push, never fails inbox

If keys are unset (local tests, a new env), `WebPushPublisher` no-ops. Integration tests inject a fake sender and assert “would send to these endpoints,” not a live FCM/Mozilla call.

### 6. Frontend lives under `features/notifications`

The folder rule already lists `notifications`. Subscribe/unsubscribe client, SW registration, and install-hint helpers go there. `AccountNotificationsPage` stays in `features/account` and calls that feature. Manifest + `sw.js` stay at the app/public root (the browser requires them there).

### 7. Secrets follow Email / R2

`WebPush__PublicKey`, `WebPush__PrivateKey`, `WebPush__Subject` on local `.env` and as Cloudflare container secrets for development + production. Same key pair can be shared across envs only if we accept mixed subscriptions; prefer **separate pairs per env** so a dev subscribe never hits prod.

## Risks / Trade-offs

- [iOS Safari without install] → OS push never arrives. Mitigation: install hint before the enable toggle; copy says Add to Home Screen, not App Store.
- [Stale SW after Pages deploy] → thin SW, `skipWaiting` + `clients.claim`, no precache of hashed JS.
- [Push send latency / provider 410] → delete that row; do not roll back the inbox insert.
- [God file] → new `WebPushSubscriptionService` + `WebPushPublisher`; do not grow `NotificationService`.

## Migration Plan

1. Generate VAPID pairs for local / dev / prod; add secrets before the first deploy that sends.
2. Ship schema + endpoints + no-op publisher if keys missing — existing notify tests stay green.
3. Then SW + Account toggle.
4. Rollback: remove the toggle and stop sending; leftover subscription rows are inert.

## Open Questions

- None that change specs. Per-kind mute and “don’t buzz if a tab is focused” stay follow-ups.
