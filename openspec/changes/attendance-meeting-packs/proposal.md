## Why

Pastors used to drop this week’s teaching notes on WhatsApp. Every meeting is different, and they could not tell which leaders actually took the file. Leaders under that meeting’s organization need the pack in Attendance, with a notify and an audit of who opened it and who downloaded it.

## What Changes

- Church managers can share a **pack** (note and/or files) on a specific meeting **occurrence** from Attendance — not on the standing meeting type.
- Leaders in that meeting’s scope are notified when the pack is published (and again only if the note or files actually change).
- Opening the pack records **seen**; taking a file records **downloaded**. Downloads go through the API so a public link cannot skip the audit.
- The pastor sees an audit list for that occurrence (used / not yet). Cell leaders cannot publish.

## Capabilities

### New Capabilities

- `attendance/meeting-packs`: Per-occurrence teaching pack, scope-based leader audience, seen/download audit, publish notify.

### Modified Capabilities

- (none)

## Impact

- API: pack CRUD + file upload/download + seen + receipts on an occurrence; new notification kind; private object-storage read (existing `TryOpenReadAsync`).
- Frontend: church managers compose from Attendance → Share files (meeting, then day). Leaders open and download from Mark attendance.
- No change to roll call, reports, windows, or guest-risk.
