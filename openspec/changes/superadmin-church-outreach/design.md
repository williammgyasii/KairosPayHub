## Context

See proposal.md for why. Place search is the Open Places API (`GET /v1/places`, category `christian_place_of_worship`). A sample around Columbus returned name, address, phone, and website, and no email field. The published address is on the church site. Madison Christian's contact page stores `info@madisonchristian.org` as HTML character references, so a raw text search misses it.

Church roles in this app are tenant roles. This page is a Kairos operator tool. The Open Places key stays in server configuration and is never sent to the browser. Outreach rows go in the existing Postgres database. Church transactional mail is a separate system and is not called here.

## Goals / Non-Goals

**Goals:**

- One pure reader that, given HTML and the church host, returns a published email or nothing.
- A fetch step that tries `/contact` and `/contact-us` before the homepage, slowly, one site at a time.
- An allowlisted `/superadmin` page that runs an area search and lists only churches with an email.

**Non-Goals:**

- Sending email, follow-ups, or unsubscribe handling. Those are a later change.
- Guessing `pastor@` or `info@` when the page has no address.
- Crawling the whole site, bypassing a challenge page, or reading pages behind a login.
- A second app, API, or database.

## Decisions

1. **Email reading is a pure function.** It HTML-decodes the page, finds addresses, and prefers the church's own host. The HTTP fetch is a separate step that only supplies HTML. The pure function is the first test, because the Madison page is the case that a raw regex misses.

2. **Open Places stays server-side.** The API needs a latitude and longitude, so the operator types an area (city, state, or ZIP) and the API geocodes it to a point, then asks Open Places. Category is `christian_place_of_worship`. The word `church` as a category returned no rows in the sample.

3. **The superadmin table is the operator account.** Rows live in `superadmin_operators` (email and password hash). Sign-in at `/superadmin/login` checks that table and issues a token marked `operator=superadmin`. Church sessions do not carry that mark, so a church login cannot open outreach. The initial row is `william@kairospayhub.com`, inserted on dev outside the migration so the password is not in source control.

3a. **Separate door, separate token.** Anonymous visitors go to `/superadmin/login`. Success stays on `/superadmin`. The operator token is stored apart from the church session, so signing in here does not replace a church login.

4. **Store the row.** Open Places data may be stored. The row is place id, name, address, website, chosen email, and the page URL it came from. Place id is the uniqueness key.

5. **Geocoding for the area** uses Census place and ZIP layers, not the street-address geocoder. `Columbus, OH` is an incorporated place (state FIPS), and a 5-digit ZIP is a ZIP Code Tabulation Area. The street-address endpoint returns no matches for either, which surfaced as "That area could not be found." The search radius stays 25 miles.

6. **The scout form is a state, then a city.** The browser location permission fills both when the operator allows it. The API still receives one area string, `City, ST`, and geocodes that place. A radius control is deferred.

7. **The saved row owns the lead status.** A new row starts as `Scouted`. The operator marks `Success`, `Failure`, or `Converted` by hand after a reply lands in the operator mailbox. The app sends from that mailbox and does not read the inbox. The dashboard reads `outreach_churches`; it does not recount the last search.

8. **A send is claimed before it goes out.** The browser makes one `Idempotency-Key` per draft and reuses it on retry. The API runs one conditional `UPDATE` that sets `SendKey` and `SendingAt` only when no send is running and the key is new; Postgres re-checks that `WHERE` after a concurrent writer commits, so only one request wins. The winner sends, then records `SentAt` and clears `SendingAt`. A failed send clears the claim so the same key may retry. A losing request is a replay (same key, already sent → the original `sentAt`) or `409`. `OutreachSendClaim.ForLostClaim` is the pure manager for that choice. Claim-then-send is at most once: a crash between the two leaves `SendingAt` set, and the church stays blocked until the column is cleared by hand.

## Risks / Trade-offs

- [Some contact pages are a form with no address] → those churches stay off the list.
- [Some sites block a non-browser client or never load] → that church is skipped, and the search still returns the others.
- [A page can contain a vendor address plus the office address] → prefer the church's own host, and keep one address.
- [Open Places is a radius search, so "all US churches" is many calls] → the operator runs one area at a time. The free plan stops at 10,000 calls a month.
- [The live API key was pasted into chat] → put a new key in server config and delete the pasted one. Do not commit it.

## Migration Plan

Add the outreach tables with a normal EF migration on the dev database. No church-tenant data moves. Rollback is dropping the new tables and removing the route.

## Open Questions

- None that change this change. Sending mail is intentionally deferred.
