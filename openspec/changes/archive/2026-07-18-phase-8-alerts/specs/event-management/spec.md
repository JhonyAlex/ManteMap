# Delta for Event Management

## ADDED Requirements

### Requirement: Upcoming Event Alert Generation

The alert scan endpoint SHALL generate alerts for recurring events with an occurrence within the next 7 days. Alerts SHALL include event title, date, and linked item (if any). Generation MUST be idempotent.

#### Scenario: Alert for upcoming recurring event

- GIVEN a recurring maintenance event with next occurrence in 3 days
- WHEN the alert scan endpoint is called
- THEN an info-severity alert is generated with alertType=upcoming_event

#### Scenario: No alert for distant event

- GIVEN a recurring event with next occurrence in 14 days
- WHEN the alert scan endpoint is called
- THEN no alert is generated (beyond 7-day threshold)
