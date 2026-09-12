## Why

Leaders only hear about approvals when the browser tab is open (SignalR + the top-bar bell). The meeting ask is the phone buzzing after they lock the screen. We already have a recipient gateway; we are missing the OS push pipe and an installable home-screen app (required for iOS Web Push).

## What Changes

- The web app becomes installable (manifest + service worker + Add to Home Screen). No Capacitor, no App Store, no bottom-tab shell.
- After the user grants permission, the browser stores a Web Push subscription and the API keeps it for that signed-in user.
- When `NotificationEngine` already creates an in-app row and SignalR-pushes it, it also sends a Web Push to that recipient’s subscriptions (phone can buzz while the app is closed).
- Recipients, kinds, title/body/link stay the existing gateway. Who gets notified does not change.
- Account → Notifications grows an enable/disable push control. Email preferences stay out of scope.

## Capabilities

### New Capabilities

- `pwa/install`: Installable web app (manifest, service worker, home-screen icon). Browser chrome only — not a native shell.
- `notifications/web-push`: Persist Web Push subscriptions and send OS notifications on the same delivery path as in-app + SignalR.

### Modified Capabilities

- (none under `openspec/specs/` yet; `notifications/gateway` is still an active change and stays in-app + SignalR)

## Impact

- **Frontend**: Web app manifest, service worker, subscribe/unsubscribe after login, install prompt UX, Account notifications toggle.
- **API**: Subscription table + register/unregister endpoints; VAPID send from `NotificationEngine` (or a sibling publisher). Inbox list/read APIs unchanged.
- **Infra**: VAPID public/private keys as secrets on local, dev, and production. HTTPS already required on Cloudflare.
- **Out of scope**: Capacitor, App Store / Play Store, bottom navigation, email/SMS, per-kind mute lists.
