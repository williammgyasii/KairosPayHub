## Purpose

Defines attendance metrics navigation and summary surfaces: meeting types first, then occurrence date, then structure-aware rollup metrics and a filterable detail table.

## ADDED Requirements

### Requirement: Metrics lists meeting types first
The attendance metrics entry point SHALL list the church’s active meeting types. Selecting a meeting type SHALL navigate to a detail experience for that type (not a single combined rollup of all types on the first screen).

#### Scenario: Fellowship leader opens metrics
- **WHEN** a fellowship leader opens attendance metrics
- **THEN** they see meeting types such as “Sunday Service” / “Cell meetings” as selectable entries
- **AND** they do not land only on a single undifferentiated church-wide total without choosing a type

### Requirement: Occurrence selection then view or log
Within a meeting type, the actor SHALL select an occurrence (date). They SHALL be able to view metrics for that occurrence and, when they have an editable sheet, log roll call for their unit from that context.

#### Scenario: Pick Sunday then view
- **WHEN** the actor opens “Sunday Service” and selects a date
- **THEN** they can view metrics for that occurrence
- **AND** if they have a submission unit sheet, they can open roll call for that date

### Requirement: Structure-aware summary tiles
For an occurrence (and viewer scope), metrics SHALL show at least: total present, total members, total first-timers, total guests, total pending approval, and approved count for **child units** using the structure layer label below the viewer (not a hard-coded “cells” label when the child layer is named otherwise). The meeting/date context (“Showing data for …”) SHALL appear on the same band as those summary tiles, not as a separate full-width banner above them.

#### Scenario: Labels follow structure
- **WHEN** the child submission units are Fellowships
- **THEN** the approved-units tile uses a Fellowship-oriented label (e.g. approved fellowships)
- **WHEN** the units are Cells
- **THEN** the label refers to cells (or the template display name)

### Requirement: Filterable detail table
The occurrence metrics detail SHALL present a dense, searchable/filterable table of unit roll-call rows (comparable to campaign member tables), not only summary cards.

#### Scenario: Search and filter units
- **WHEN** the viewer is on an occurrence metrics table
- **THEN** they can search/filter rows (e.g. by unit name or status)
- **AND** see pending vs approved submission state per unit in scope
