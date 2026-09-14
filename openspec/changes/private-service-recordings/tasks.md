## 1. Foundation (feature flag + Bunny config)

- [x] 1.1 OpenSpec proposal, design, spec, tasks
- [x] 1.2 `ServiceRecordingFeaturePolicy` + unit tests
- [x] 1.3 `FeatureFlagsOptions`, `BunnyStreamOptions`, Cloudflare env passthrough
- [x] 1.4 `GET /api/me` → `features.serviceRecordings`
- [x] 1.5 Frontend policy helper + `Me.features` type

## 2. Data + Bunny client

- [x] 2.1 `ChurchServiceRecording` entity + migration
- [x] 2.2 `BunnyStreamClient` (create video, get status)
- [x] 2.3 Webhook controller for encoding status

## 3. API endpoints

- [x] 3.1 Create recording + upload URL
- [x] 3.2 List / publish / unpublish / delete
- [x] 3.3 Playback token endpoint

## 4. Frontend

- [x] 4.1 Recordings nav (flag-gated) + routes
- [x] 4.2 Upload wizard (direct to Bunny)
- [x] 4.3 Player page with signed embed

## 5. Ops

- [x] 5.1 Enable Bunny embed token auth + store token security key
- [x] 5.2 Dev Worker secrets for Bunny library key
- [x] 5.3 Document in `infra/environments.md`
