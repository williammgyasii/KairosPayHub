## 1. Subscription API

- [x] 1.1 Add failing integration tests: signed-in user can upsert a subscription and delete it; anonymous PUT is 401; a second device endpoint stays stored for the same user. Verify the tests fail.
- [x] 1.2 Add `PushSubscription` entity + migration, `GET /api/notifications/push/vapid-key`, `PUT`/`DELETE /api/notifications/push/subscriptions`, and `WebPushSubscriptionService`. Verify the tests in 1.1 pass. Missing VAPID keys still return a clear 503 on vapid-key, not a 500.

## 2. Send on existing deliver path

- [x] 2.1 Add a failing integration test: creating any existing notification for a subscribed pastor records a send to that endpoint with the inbox title/body/link; a user with no subscription creates the inbox row only; a 410 from the fake sender deletes that subscription and still returns the inbox row. Verify it fails.
- [x] 2.2 Add `WebPushPublisher` (fake in tests, WebPush library in prod) and call it from `NotificationEngine.DeliverAsync` after persist + SignalR. Verify the test in 2.1 passes and existing notification tests stay green. Do not grow `NotificationService`.

## 3. Installable PWA

- [x] 3.1 Add `manifest.webmanifest`, icons, and `index.html` link so Lighthouse / browser install criteria see name, icons, start URL, and `display: standalone`. Verify the built `dist` includes the manifest and the installed start URL is `/`.
- [x] 3.2 Add a thin `sw.js` (push + notificationclick + skipWaiting, no Workbox precache) and register it from the signed-in shell. Verify a click payload with `linkPath` navigates there, and a payload without a path opens `/`.

## 4. Account toggle and iOS hint

- [x] 4.1 Add `features/notifications` subscribe/unsubscribe helpers and wire Account → Notifications enable/disable. Verify unit tests cover “permission denied does not PUT” and “disable DELETEs the current endpoint.”
- [x] 4.2 Show the iOS Add to Home Screen hint when the session is iOS Safari and not already standalone. Verify the hint is hidden in standalone / Android Chrome, and the page still does not mention an App Store.

## 5. Secrets and smoke

- [x] 5.1 Document and add `WebPush__*` to local `.env` plus Cloudflare container secrets for development (separate pair from production). Verify `GET /api/notifications/push/vapid-key` succeeds on local after restart.
- [x] 5.2 Restart API + frontend. Smoke: enable push on a second device or browser, trigger a pending-approval notification, confirm the OS banner and that the bell still updates.
- [x] 5.3 OS banners use the PWA product icon (`/icons/icon-192.png`) for `icon` and `badge`. Verify `osNotificationChrome` and that `sw.js` passes those URLs to `showNotification`.
