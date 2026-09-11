## Purpose

Membership name badges tell a leader who is pending, who just joined, and which row is their own, without the table comparing member ids itself.

## ADDED Requirements

### Requirement: Current member row is labeled You

When the viewer has a linked member on the roster, that row SHALL show a You badge on the name. The same row MUST NOT also show New. Other members created within the last 14 days SHALL still show New. Sort order MUST stay Pending, then New, then everyone else — You MUST NOT move the viewer’s row to the top.

#### Scenario: Signed-in member always sees You

- **WHEN** a leader opens Membership
- **AND** their linked member is on the table
- **THEN** their name cell shows a You badge
- **AND** that cell does not show New

#### Scenario: Recent other member still shows New

- **WHEN** another member was created within the last 14 days
- **AND** that member is not the viewer
- **THEN** that name cell shows New
- **AND** it does not show You

#### Scenario: Older current member still shows You

- **WHEN** the viewer’s linked member was created more than 14 days ago
- **THEN** their name cell shows You
- **AND** it does not show New

#### Scenario: You does not change sort

- **WHEN** Membership lists pending joiners, recent members, and the viewer
- **THEN** pending rows stay first
- **AND** other recent members stay above older members
- **AND** the viewer’s row stays in that recency order, not pinned to the top
