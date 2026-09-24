## 1. Contact-page reader

- [x] 1.1 Write a failing unit test that decodes HTML character references on a contact page and returns `info@madisonchristian.org`. Verify the test fails before production code exists.
- [x] 1.2 Write a failing unit test that returns no address when the contact page and homepage have none, and a failing test that prefers the church's own host when two addresses are present. Verify both fail for the missing behavior.
- [x] 1.3 Implement the smallest reader that passes those tests. Verify the reader tests pass.

## 2. Allowlist

- [x] 2.1 Write a failing test that an allowlisted email may call the outreach API and a church pastor email receives a refusal. Verify the test fails.
- [x] 2.2 Enforce `Outreach:OperatorEmails` on the outreach API, with `william@kairospayhub.com` as the initial value. Verify the allowlist test passes.

## 3. Area search and scout

- [x] 3.1 Write a failing test that an area search asks Open Places for `christian_place_of_worship` and keeps churches that have a website. Verify the test fails.
- [x] 3.2 Add the server-side Open Places client and US Census geocode of the operator's area, with a 25-mile radius. Verify the search test passes with a fake HTTP client.
- [x] 3.3 Write a failing test that a stored place id is not inserted twice, and that a church with no fetched email is absent from the sendable list. Verify the test fails.
- [x] 3.4 Persist outreach rows in the existing database and run the contact reader over fetched pages. Verify the persistence test passes against the dev database.

## 4. Superadmin page

- [x] 4.1 Add the `/superadmin` route, visible only when the signed-in email is allowlisted. Verify a pastor session does not see the page and an allowlisted session does.
- [x] 4.2 Show the sendable list for an area search: church name, website, and the email that was found. Verify the page renders those three fields from the API response.

## 5. Operator door

- [x] 5.1 Write a failing test that an anonymous visit to `/superadmin` shows `/superadmin/login`, and that a successful sign-in there opens the outreach page. Verify the test fails.
- [x] 5.2 Add the operator sign-in and point `/superadmin` at it. Verify the door test passes.

## 6. Superadmin operator table

- [x] 6.1 Write a failing test that a password match against `superadmin_operators` signs in, and a church session is refused. Verify the test fails.
- [x] 6.2 Add the table, the sign-in, and the dev row for `william@kairospayhub.com`. Verify the test passes.

## 7. Lead desk

- [x] 7.1 Write a failing test that a saved church is listed as Scouted, an operator can mark it Converted, and a church session is refused. Verify the test fails.
- [x] 7.2 Add the status on the saved row and the list and update endpoints. Verify the lead test passes.
- [x] 7.3 Write a failing page test that scouting uses a state dropdown and a city, and that a location permission fills both. Verify the test fails.
- [x] 7.4 Show the saved leads on the outreach page and let the operator mark Responded or Converted. Verify the page test passes.

## 8. Reach out

- [x] 8.1 Send from the saved lead through the operator mailbox, record that it was reached, and let the operator mark Success, Failure, or Converted.
