# Service Recordings

Private church service recordings (VOD) via Bunny Stream.

## Feature flag

### Scenario: Platform flag off and church not allowlisted

- **WHEN** `FeatureFlags:ServiceRecordings:Enabled` is false and the church id is not in `AllowedChurchIds`
- **THEN** `GET /api/me` MUST return `features.serviceRecordings: false`
- **AND** service recording API endpoints MUST return 403
- **AND** the Recordings nav item MUST NOT appear

### Scenario: Platform flag off but church allowlisted (pilot)

- **WHEN** the platform flag is false and the church id is in `AllowedChurchIds`
- **THEN** `features.serviceRecordings` MUST be true for members of that church
- **AND** recording endpoints MUST be available for that church only

### Scenario: Platform flag on (GA)

- **WHEN** `FeatureFlags:ServiceRecordings:Enabled` is true
- **THEN** all onboarded churches MUST see `features.serviceRecordings: true`

## Upload and publish

### Scenario: Pastor uploads a recording

- **WHEN** a church manager uploads a video within size/duration limits
- **THEN** the file MUST be sent directly to Bunny Stream
- **AND** the API MUST NOT stream the video body through the application server

### Scenario: Pastor lists all recordings

- **WHEN** a church manager requests `GET /api/service-recordings`
- **THEN** the response MUST include draft, processing, ready, and failed recordings for their church

### Scenario: Member lists published recordings only

- **WHEN** a logged-in member requests `GET /api/service-recordings`
- **THEN** the response MUST include only recordings with `publishedAt` set and status `Ready`

### Scenario: Pastor publishes a ready recording

- **WHEN** a church manager calls `POST /api/service-recordings/{id}/publish` on a ready, unpublished recording
- **THEN** `publishedAt` MUST be set
- **AND** members of the church MUST see the recording in list/detail endpoints

### Scenario: Pastor previews before publish

- **WHEN** a church manager requests playback on a ready but unpublished recording
- **THEN** the API MUST return a short-lived signed Bunny embed URL

### Scenario: Member watches a published recording

- **WHEN** a logged-in member of the church requests playback on a published, ready recording
- **THEN** the API MUST return a short-lived signed Bunny embed URL
- **AND** the member MUST NOT receive a permanent public video URL

### Scenario: Member cannot access unpublished recordings

- **WHEN** a member requests detail or playback for an unpublished recording
- **THEN** the API MUST respond with 404

### Scenario: Publish notifies church members

- **WHEN** a church manager publishes a ready recording
- **THEN** every other church user with a login MUST receive an inbox notification
- **AND** subscribed devices MUST receive a web push with the same title, body, and link
- **AND** the publisher MUST NOT receive the notification

## Categories

### Scenario: Pastor creates a recording category

- **WHEN** a church manager calls `POST /api/service-recording-categories` with a name
- **THEN** the category MUST be stored for that church
- **AND** duplicate names within the church MUST be rejected

### Scenario: Pastor assigns a category on upload

- **WHEN** a church manager creates a recording with `categoryId`
- **THEN** the recording MUST belong to that church category

### Scenario: Recordings list filters by category

- **WHEN** a user requests `GET /api/service-recordings?categoryId={id}`
- **THEN** the response MUST include only recordings in that category
- **AND** existing visibility rules for managers vs members MUST still apply

### Scenario: Member sees categories with published recordings only

- **WHEN** a member requests `GET /api/service-recording-categories`
- **THEN** the response MUST include only categories that have at least one published, ready recording

## Custom thumbnails

### Scenario: Pastor uploads a custom thumbnail

- **WHEN** a church manager posts an image to `POST /api/service-recordings/{id}/thumbnail`
- **THEN** the image MUST be stored in object storage
- **AND** list/detail responses MUST return the custom thumbnail URL

### Scenario: Custom thumbnail takes priority over Bunny auto thumbnail

- **WHEN** a recording has both a Bunny-generated thumbnail and a pastor-uploaded custom thumbnail
- **THEN** the API MUST return the custom thumbnail for display

## Encoding status (realtime)

### Scenario: Webhook updates encoding status for open managers

- **WHEN** Bunny Stream sends a webhook that changes a recording's status (e.g. Processing → Ready)
- **THEN** the API MUST persist the new status
- **AND** every connected church manager (Pastor or ChurchAdmin) MUST receive a SignalR `ServiceRecordingStatusChanged` event
- **AND** the client MUST invalidate service recording list/detail caches so the grid encoding overlay clears without navigation or polling

### Scenario: Publish notification also refreshes recordings

- **WHEN** a manager receives a `ServiceRecordingPublished` inbox notification over SignalR
- **THEN** the client MUST invalidate service recording caches so the grid reflects the new published state
