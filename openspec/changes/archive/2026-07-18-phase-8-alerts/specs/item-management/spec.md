# Delta for Item Management

## ADDED Requirements

### Requirement: Status Transition Alert Generation

The system SHALL generate alerts when `transitionStatus()` moves an item to an incident, blocking, or final status. Alert severity SHALL map from the status configuration. Generation MUST be idempotent.

#### Scenario: Alert on incident status transition

- GIVEN an item with status "Active"
- WHEN status transitions to "Incident" (isIncident=true)
- THEN a critical-severity alert is generated with alertType=status_change

#### Scenario: Alert on blocking status transition

- GIVEN an item
- WHEN status transitions to a status where isBlocking=true
- THEN a warning-severity alert is generated

#### Scenario: No alert on normal transition

- GIVEN an item with status "Inactive"
- WHEN status transitions to "Active"
- THEN no alert is generated (neither incident, blocking, nor final)
