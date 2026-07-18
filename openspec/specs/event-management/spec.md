# Event Management Specification

## Purpose

Project-scoped event CRUD for scheduling maintenance, inspections, and tracking dates associated with items.

## Requirements

### Requirement: Event Model

The system SHALL store events with title, description, start/end dates (UTC), optional item association, optional recurrence rule, and project scoping.

| Field | Type | Required |
|-------|------|----------|
| title | string | Yes |
| description | string | No |
| startDate | DateTime (UTC) | Yes |
| endDate | DateTime (UTC) | No |
| projectId | FK | Yes |
| itemId | FK | No |
| rrule | string | No |
| color | string | No |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### Scenario: Create manual event

- GIVEN an authenticated user with project access
- WHEN they create an event with title, startDate, and endDate
- THEN the event is persisted with the project association

#### Scenario: Associate event with item

- GIVEN an existing item in the project
- WHEN an event is created with itemId referencing that item
- THEN the event links to the item and appears in item context

### Requirement: Event CRUD API

Routes under `/api/projects/{projectId}/events/`. Authentication and project membership enforced.

| Method | Path | Description |
|--------|------|-------------|
| GET | /events | List events (date-range filter) |
| POST | /events | Create event |
| GET | /events/[eventId] | Get single event |
| PUT | /events/[eventId] | Update event |
| DELETE | /events/[eventId] | Delete event |

#### Scenario: List events by date range

- GIVEN a project with 50 events, 10 in March 2026
- WHEN GET /events?from=2026-03-01&to=2026-03-31
- THEN only the 10 March events return

#### Scenario: Update event

- GIVEN an existing event
- WHEN title and endDate are updated
- THEN only those fields change, timestamps update

#### Scenario: Delete event

- GIVEN an existing event
- WHEN DELETE is called
- THEN the event is removed, no orphan references remain

#### Scenario: Cross-project denied

- GIVEN a user in project A only
- WHEN accessing project B events
- THEN 403 is returned

### Requirement: Event Validation

Zod schemas SHALL validate create/update payloads. startDate MUST be a valid date. endDate, if present, MUST be after startDate.

#### Scenario: Reject invalid date range

- GIVEN startDate = 2026-03-15, endDate = 2026-03-10
- WHEN create is attempted
- THEN validation error: "endDate must be after startDate"

#### Scenario: Accept event without endDate

- GIVEN startDate = 2026-03-15, endDate = null
- WHEN create is attempted
- THEN event is created successfully
