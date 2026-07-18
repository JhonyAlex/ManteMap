# Recurrence Specification

## Purpose

RRULE-based recurrence for events, allowing users to define repeating patterns (daily, weekly, monthly, yearly) and expand occurrences within a date range.

## Requirements

### Requirement: RRULE Storage

Events MAY have an `rrule` field storing an RFC 5545 RRULE string. The system SHALL use `rrule.js` for parsing and expansion.

#### Scenario: Store weekly recurrence

- GIVEN an event created with "repeat every Monday"
- WHEN saved
- THEN rrule = "FREQ=WEEKLY;BYDAY=MO" is stored on the event

#### Scenario: Non-recurring event

- GIVEN an event with no recurrence
- WHEN saved
- THEN rrule is null

### Requirement: Recurrence Picker UI

The event form SHALL include a recurrence picker allowing users to select frequency (daily/weekly/monthly/yearly), interval, and day-of-week (for weekly).

#### Scenario: Select weekly on Monday/Wednesday

- GIVEN the recurrence picker is open
- WHEN user selects "Weekly" and checks Monday and Wednesday
- THEN the preview shows "Every week on Mon, Wed"

#### Scenario: Clear recurrence

- GIVEN an event with recurrence configured
- WHEN user clicks "No repeat"
- THEN rrule is cleared and the preview hides

### Requirement: Occurrence Expansion

The API SHALL expand recurring events into individual occurrences within the requested date range. Each occurrence inherits the parent event's data with adjusted dates.

#### Scenario: Expand monthly event for Q1

- GIVEN a recurring event "Monthly review" with rrule="FREQ=MONTHLY" starting Jan 15
- WHEN GET /events?from=2026-01-01&to=2026-03-31
- THEN 3 occurrences return: Jan 15, Feb 15, Mar 15

#### Scenario: Daily event expansion

- GIVEN an event with rrule="FREQ=DAILY;COUNT=5" starting March 1
- WHEN GET /events?from=2026-03-01&to=2026-03-10
- THEN 5 occurrences return (March 1–5)

#### Scenario: No expansion for non-recurring

- GIVEN a one-time event on March 15
- WHEN GET /events?from=2026-03-01&to=2026-03-31
- THEN exactly 1 event returns

### Requirement: Recurrence Validation

RRULE strings SHALL be validated on create/update. Invalid RRULEs MUST be rejected.

#### Scenario: Reject malformed RRULE

- GIVEN rrule="NOTVALID"
- WHEN create is attempted
- THEN validation error: "Invalid recurrence rule"

#### Scenario: Accept valid RRULE

- GIVEN rrule="FREQ=WEEKLY;INTERVAL=2"
- WHEN create is attempted
- THEN event is created with the biweekly pattern
