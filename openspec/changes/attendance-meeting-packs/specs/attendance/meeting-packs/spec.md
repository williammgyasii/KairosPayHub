## Purpose

Lets a church manager share notes and files for one meeting occurrence, notify leaders in that meeting’s scope, and see who opened the pack and who downloaded a file.

## ADDED Requirements

### Requirement: Pack belongs to one occurrence

A church manager SHALL be able to publish one pack on a meeting occurrence, with an optional note and zero or more files. Publish MUST be rejected when both the note is blank and there are no files. A meeting type MUST NOT store the week’s files. Existing occurrences without a pack MUST look unchanged.

#### Scenario: Note or files can publish

- **WHEN** a church manager shares a note, a file, or both on this week’s Cell Meeting occurrence
- **THEN** that occurrence has a pack
- **AND** next week’s occurrence of the same type does not

#### Scenario: Empty pack is rejected

- **WHEN** a church manager tries to publish with no note and no files
- **THEN** the publish is not accepted

#### Scenario: Cell leader cannot publish

- **WHEN** a cell leader tries to publish a pack
- **THEN** the request is forbidden

### Requirement: Church managers share from a dedicated Attendance page

Church managers SHALL share packs from a **Share files** destination under Attendance, by choosing a meeting type and then a service date. That compose surface MUST NOT live on Meeting types. Leaders in scope SHALL still open and download the pack from Mark attendance.

#### Scenario: Pastor picks meeting then day

- **WHEN** a church manager opens Share files
- **THEN** they choose a meeting type and a date for that type
- **AND** they can publish the pack for that occurrence

#### Scenario: Meeting types stays types-only

- **WHEN** a church manager opens Meeting types
- **THEN** they do not compose a week’s files there

#### Scenario: Shared pack has its own pane

- **WHEN** a church manager has picked a day
- **THEN** Share files is split: compose on one side, a table of that day’s files and who used them on the other
- **AND** an unshared day shows an empty shared pane

### Requirement: Audience is leaders in the meeting scope

Leaders who receive the pack and appear on the audit SHALL be the structure leaders whose assignment sits in that meeting type’s scope (church-wide → all church leaders with logins; scoped unit → leaders under that unit). Members without a leadership assignment MUST NOT be in the audience. Church managers who publish MUST NOT be required on the unused list. Audience MUST NOT be chosen by meeting title.

#### Scenario: Church-wide meeting notifies church leaders

- **WHEN** a church-wide Cell Meeting pack is published
- **THEN** cell and fellowship leaders for that church are notified
- **AND** ordinary members are not

#### Scenario: Scoped meeting stays in that branch

- **WHEN** a pack is published on a meeting scoped to one fellowship
- **THEN** only leaders under that fellowship are notified

### Requirement: Seen and downloaded are audited through the app

Opening the pack SHALL record seen (first time, with a timestamp). Downloading a file SHALL record downloaded (first time, with a timestamp) and MUST stream the file through the API. A public object URL MUST NOT be returned for pack files. A church manager SHALL see each audience leader’s seen and downloaded times (or unused) for that occurrence.

#### Scenario: Leader opens then downloads

- **WHEN** a leader in scope opens the pack
- **THEN** seen is recorded
- **AND WHEN** they download a file
- **THEN** downloaded is recorded
- **AND** they receive the file bytes

#### Scenario: Leader must download before roll call

- **WHEN** a pack with files exists for the selected day
- **THEN** the leader cannot continue to mark attendance until they download a file
- **AND** a note-only pack does not block Continue

#### Scenario: Pastor sees unused leaders

- **WHEN** a church manager opens the audit after some leaders have not touched the pack
- **THEN** those leaders appear as unused
- **AND** leaders who downloaded show a downloaded time

### Requirement: Publish notifies; replace notifies only on content change

Publishing a new pack SHALL send an in-app notification to the audience with a link to that occurrence’s pack. Replacing the pack SHALL notify again only when the note or files changed.

#### Scenario: First publish notifies

- **WHEN** a church manager publishes a pack
- **THEN** each audience leader receives an `AttendanceMeetingPackPublished` notification

#### Scenario: Unchanged replace is quiet

- **WHEN** a church manager saves the same note and files again
- **THEN** no new notification is sent
