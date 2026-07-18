# Document Expiration Events Specification

## Purpose

Auto-generated calendar events derived from document expiration dates, providing visual urgency indicators on the calendar.

## Requirements

### Requirement: Expiration Event Generation

The system SHALL generate read-only calendar events from documents that have a non-null `expiresAt`. These events appear alongside manual events in calendar queries.

#### Scenario: Document with expiration appears on calendar

- GIVEN a document with expiresAt=2026-04-15
- WHEN calendar events are fetched for April 2026
- THEN an expiration event appears on April 15 with the document name

#### Scenario: Document without expiration excluded

- GIVEN a document with expiresAt=null
- WHEN calendar events are fetched
- THEN no expiration event is generated for that document

### Requirement: Color-Coded Urgency

Expiration events SHALL be color-coded based on proximity to expiration.

| Condition | Color |
|-----------|-------|
| expiresAt < now | Red |
| expiresAt within 30 days | Yellow |
| expiresAt > 30 days | Default/Blue |

#### Scenario: Expired document shows red

- GIVEN a document expired 5 days ago
- WHEN calendar renders
- THEN the event pill is red

#### Scenario: Expiring soon shows yellow

- GIVEN a document expiring in 10 days
- WHEN calendar renders
- THEN the event pill is yellow

#### Scenario: Future expiration shows default

- GIVEN a document expiring in 60 days
- WHEN calendar renders
- THEN the event pill uses default color

### Requirement: Expiration Event Metadata

Expiration events SHALL include: document name, linked item name, expiration date, and a flag identifying them as read-only (not editable/deletable via calendar).

#### Scenario: Click expiration event

- GIVEN an expiration event on the calendar
- WHEN the user clicks it
- THEN a popover shows document name, item link, and expiration date
- AND no edit/delete actions are available

### Requirement: Unified Event API

The events API SHALL merge manual events and document expiration events into a single response. Expiration events use a distinct type discriminator.

#### Scenario: Mixed event types in response

- GIVEN 3 manual events and 2 document expirations in March
- WHEN GET /events?from=2026-03-01&to=2026-03-31
- THEN 5 events return, each with type="manual" or type="document_expiration"

#### Scenario: Filter by event type

- GIVEN mixed events in the API
- WHEN GET /events?type=document_expiration
- THEN only document expiration events return
