## Purpose

Makes KairosPayHub installable on a phone home screen as a standalone web app, which is the store-free path and a prerequisite for iOS Web Push.

## ADDED Requirements

### Requirement: Signed-in app is installable

The signed-in web app SHALL be installable as a Progressive Web App (name, icons, start URL, standalone display). The installed app MUST open the existing product routes. It MUST NOT wrap the site in a native WebView or add a bottom-tab shell.

#### Scenario: Browser offers install

- **WHEN** a signed-in leader opens the app on a browser that supports web-app install
- **THEN** the app meets install criteria (manifest + service worker)
- **AND** the leader can add it to the home screen using the browser’s install or Add to Home Screen flow

#### Scenario: Installed app uses existing navigation

- **WHEN** a leader opens the installed app from the home-screen icon
- **THEN** they land on the existing signed-in shell (top bar and sidebar)
- **AND** no new bottom-tab navigation is shown

### Requirement: iOS home-screen install is documented in product copy

On iOS Safari, where the browser does not show a native install button, the product SHALL tell the leader how to Add to Home Screen. After install, the app SHALL run in standalone display.

#### Scenario: iOS shows Add to Home Screen hint

- **WHEN** a signed-in leader is on iOS Safari and has not already installed the app
- **THEN** the UI explains Add to Home Screen (Share → Add to Home Screen)
- **AND** it does not claim an App Store download exists
