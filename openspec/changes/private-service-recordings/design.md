## Context

See proposal.md. Meeting packs already use private R2 + API streaming for PDFs; video needs transcoding/HLS — Bunny Stream handles that. Prior conversation locked: nav label **Recordings**, prod flag **false**, live streaming later as premium.

## Goals / Non-Goals

**Goals:**

- `ServiceRecordingFeaturePolicy` — platform flag, allowlist, upload/watch/publish rules.
- Bunny Stream integration: create video, direct upload to Bunny, webhook encoding status, signed embed playback.
- Feature visible only when policy says so; API returns 403 when off.

**Non-Goals (v1):**

- Live RTMP (Bunny live not required yet).
- Public/embed links, download button, fellowship-scoped audience.
- R2 raw MP4 pipeline.

## Decisions

### 1. Bunny Stream (not Cloudflare Stream, not R2 DIY)

**Choice:** One platform video library; per-church **collections** for organization. Library API key + embed token auth.

**Why:** GB-based pricing; free transcode; less eng than R2 Range streaming; pastors upload MP4/MOV.

### 2. Upload path: browser → Bunny directly

**Choice:** API creates Bunny video object + returns upload URL; browser PUTs binary to Bunny. API never proxies video bytes.

**Why:** Avoid choking the .NET container (same lesson as large meeting-pack files, but worse at video scale).

### 3. Feature flag in Cloudflare `wrangler.jsonc` vars

**Choice:** `FEATURE_FLAG_SERVICE_RECORDINGS_ENABLED` + `FEATURE_FLAG_SERVICE_RECORDINGS_ALLOWED_CHURCH_IDS` in Worker vars → `FeatureFlags__ServiceRecordings__*` in container. Default `false` in production block.

**Why:** Non-secret, reviewable in git; prod stays off until intentional flip.

### 4. Policy manager

**Choice:** `ServiceRecordingFeaturePolicy.IsEnabled(platformOptions, churchId)` — pure. Controllers and `GET /api/me` consume it.

**What changes:** flag, allowlist, church. **What stays:** Bunny client, upload engine, player.

### 5. Playback tokens

**Choice:** API mints Bunny embed token (`SHA256(tokenSecurityKey + videoGuid + expires)`). Frontend loads iframe; no raw CDN URL in UI.

**Requires:** Enable embed token authentication on the Bunny library (dashboard).

## Data model (chunk 2+)

```text
ChurchServiceRecording
  churchId, title, serviceDate, bunnyVideoGuid, status, publishedAt, retentionExpiresAt
```

## Risks

- [Bunny token key not configured] → playback fails until pastor enables embed auth in Bunny dashboard.
- [Rewatch delivery cost] → cap retention + paid add-on later.
- [User pasted account API key in chat] → use **library** ApiKey for Stream calls; rotate account key if exposed.

## Migration

New table in chunk 2. Chunk 1: flag + Bunny options + `/api/me` features only.
