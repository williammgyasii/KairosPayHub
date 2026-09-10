## Why

Add member asks “new to church?”, requires email for people who will never get a login, and always defaults the phone to Ghana. Birthday belongs with personal details, not the first screen.

## What Changes

- Drop the new-to-church question from create (default responsiveness).
- First step: name, phone, optional email. Birthday (required) + residence on the next step.
- Phone country defaults from the church `countryCode`.
- Email stays on the form but is not required for ordinary members.

## Impact

- Frontend create wizard + step plan + phone country helper
- Tests for step plan, church phone default, and wizard validation
