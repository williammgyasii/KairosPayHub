## ADDED Requirements

### Requirement: No Open now demo on create form
The meeting-type create form SHALL NOT offer an “Open now (demo)” control. Always open (and normal window fields) SHALL remain the supported ways to control submission availability.

#### Scenario: Pastor creates meeting type
- **WHEN** a pastor opens Add meeting type
- **THEN** there is no Open now (demo) checkbox
- **AND** Always open remains available

### Requirement: Aligned window field layout
When Always open is off, Submission opens and Deadline day/time controls SHALL be laid out in a consistent aligned grid (day select + time on matching rows/columns).

#### Scenario: Finite window fields align
- **WHEN** Always open is off on the create or edit form
- **THEN** open day/time and deadline day/time controls appear in an aligned two-column (or equivalent) grid without visibly misaligned rows
