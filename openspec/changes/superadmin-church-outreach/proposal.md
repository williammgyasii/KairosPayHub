## Why

Kairos needs a way to find churches and a public email for each one, so an operator can tell them about the product. Place search returns a website and a phone, and it does not return an email. The email is on the church site, usually the contact page.

## What Changes

- Add a `/superadmin` page in the existing app for an allowlisted operator.
- Search churches with the Open Places API (`christian_place_of_worship`) around an operator-supplied area. The API requires a map point, so the area is how a batch is chosen.
- For each church website, read `/contact` and then the homepage, decode the HTML, and keep a published email address.
- Show only churches where an email was found. Skip dead sites and contact pages that have no address.
- Store the outreach row in the existing database: place id, name, address, website, email, and the page the email came from.
- Sending the email is a later change. This change stops at a list the operator can trust.

## Capabilities

### New Capabilities

- `outreach/church-scout`: Allowlisted operator searches an area, the system reads church contact pages, and the page lists only churches with a published email.

### Modified Capabilities

## Impact

- New API endpoints under the existing .NET API, guarded by an operator email allowlist (initially `william@kairospayhub.com`).
- New React route `/superadmin`. No new frontend, API host, or database.
- Open Places API key stays on the server. Church transactional mail (Resend) is not used for this search.
- New tables for outreach rows. Church roles and church tenant data stay unchanged.
