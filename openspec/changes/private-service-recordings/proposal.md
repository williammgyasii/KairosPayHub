## Why

Churches want to share Sunday service recordings with members privately — not on YouTube or via shareable links. V1 is upload-and-watch only (live streaming deferred as a paid add-on). Bunny Stream provides managed transcoding, HLS playback, and token auth at lower cost than Cloudflare Stream minute billing.

Production clients are live today; the feature must ship behind a platform feature flag until rollout is intentional.

## What Changes

- Pastors upload a service recording; members watch **Recordings** in-app only.
- Playback uses Bunny embed/HLS with **short-lived signed tokens** minted by the API after church membership check.
- Platform feature flag (`FeatureFlags:ServiceRecordings`) defaults **off in production**; optional church allowlist for pilot.
- Bunny Stream library (one platform library, collections per church later).

## Capabilities

### New Capabilities

- `media/service-recordings`: Private VOD upload, publish, list, token playback, retention limits, feature-flag gating.

### Modified Capabilities

- `account/self-profile`: `GET /api/me` exposes `features.serviceRecordings` for nav gating.

## Impact

- API: new media service + controller, Bunny webhook, `FeatureFlags` + `BunnyStream` config, Cloudflare Worker env passthrough.
- Frontend: `features/media/` — Recordings nav (flag-gated), upload wizard, player (later chunks).
- Infra: Bunny secrets on Cloudflare Worker (dev first); prod flag stays false until GA.
