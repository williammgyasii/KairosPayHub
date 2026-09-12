## Purpose

Sends the same notifications that already appear in the in-app bell as OS push so a locked phone can buzz when the browser tab is closed.

## ADDED Requirements

### Requirement: Leader can enable and disable Web Push

A signed-in leader SHALL be able to turn Web Push on or off from Account → Notifications. Enabling MUST request the browser’s notification permission and store a subscription for that user. Disabling MUST remove that device’s subscription. The system MUST NOT register a subscription without a signed-in user.

#### Scenario: Enable push stores a subscription

- **WHEN** a signed-in leader turns push on and grants the browser permission
- **THEN** the API stores a Web Push subscription for that auth user
- **AND** later in-app notifications for that user can also be delivered as OS push

#### Scenario: Enable points at the browser chrome

- **WHEN** a signed-in leader turns push on and the browser has not decided yet
- **THEN** the page tells them to Allow notifications in the address bar
- **AND** it does not wait for a dialog on the Alerts card

#### Scenario: Enable button reflects this device

- **WHEN** this browser already has a stored push subscription, or enable just succeeded
- **THEN** the page shows that push is on for this device
- **AND** it does not keep offering Enable push as if nothing happened

#### Scenario: Hang after Allow is not an address-bar timeout

- **WHEN** the leader has already granted notification permission
- **AND** finishing the subscription takes too long
- **THEN** the page says it could not finish enabling
- **AND** it does not tell them to click Allow again

#### Scenario: Edge can need a second click

- **WHEN** the browser is Edge and the leader has just granted notification permission
- **THEN** the page asks them to click Enable push once more before subscribing
- **AND** a later hang names Edge and points at Chrome, Firefox, or Safari

#### Scenario: Disable push removes the device

- **WHEN** a signed-in leader turns push off
- **THEN** that device’s stored subscription is removed
- **AND** later notifications still create the in-app inbox row
- **AND** that device no longer receives an OS push for them

#### Scenario: Anonymous register is rejected

- **WHEN** an unauthenticated client tries to register a push subscription
- **THEN** the API rejects the request
- **AND** no subscription is stored

### Requirement: Delivery uses the existing notify path

When the notification engine delivers an in-app notification, it SHALL also send a Web Push to each stored subscription for those recipients. Recipients, kind, title, body, and link MUST stay the same as the in-app row. Who gets notified MUST NOT change.

#### Scenario: Closed app still gets the OS banner

- **WHEN** a pastor is subscribed to Web Push and has no open app tab
- **AND** a contribution pending-approval notification is created for that pastor
- **THEN** the pastor still receives the in-app inbox row
- **AND** the device shows an OS notification with that row’s title and body
- **AND** the banner uses the product PWA icon (not a generic browser mark)

#### Scenario: No subscription still gets the bell

- **WHEN** a leader has never enabled Web Push
- **AND** a notification is created for them
- **THEN** they still receive the in-app inbox row and SignalR update if a tab is open
- **AND** no OS push is sent for that user

#### Scenario: Recipients stay the gateway

- **WHEN** any existing notification kind is fired
- **THEN** Web Push is sent only to the same recipient set the in-app engine already chose
- **AND** the OS payload uses that notification’s title, body, and link path

### Requirement: Tapping the OS notification opens the linked screen

Activating an OS notification SHALL open the installed or browser app at the notification’s link path when one is present. If there is no link path, it SHALL open the signed-in app home.

#### Scenario: Tap opens the approval screen

- **WHEN** a subscribed leader taps an OS notification whose link path is a contribution or attendance approval screen
- **THEN** the app opens that path
- **AND** the inbox row already exists so the bell count matches

### Requirement: Multiple devices and stale endpoints

A user MAY have more than one stored subscription (phone and laptop). A send that learns an endpoint is gone MUST drop that subscription and MUST NOT fail the in-app delivery for other recipients.

#### Scenario: Two devices both buzz

- **WHEN** the same leader enabled push on a phone and a laptop
- **AND** a notification is created for them
- **THEN** both stored subscriptions receive the OS push

#### Scenario: Dead endpoint is cleaned up

- **WHEN** the push service reports that a stored endpoint is gone
- **THEN** that subscription is deleted
- **AND** in-app delivery for that notification still succeeds
