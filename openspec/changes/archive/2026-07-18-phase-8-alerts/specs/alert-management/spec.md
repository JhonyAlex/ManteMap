# Alert Management Specification

## Purpose

Persistent in-app alerts for document expirations, status changes, and upcoming maintenance. Deduplication, acknowledgment, and filtering.

## Requirements

### Requirement: Alert Model

The system SHALL store alerts with type, severity, status, source references, and project scoping.

| Field | Type | Required |
|-------|------|----------|
| alertType | enum (document_expiration, status_change, upcoming_event) | Yes |
| severity | enum (info, warning, critical) | Yes |
| status | enum (unread, acknowledged, dismissed) | Yes |
| sourceType | string | Yes |
| sourceId | string | Yes |
| message | string | Yes |
| metadata | Json | No |
| projectId | FK | Yes |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Unique constraint: `@@unique([sourceType, sourceId, alertType])`

#### Scenario: Alert persists

- GIVEN a document expiring in 7 days
- WHEN an alert is generated
- THEN the alert persists with alertType=document_expiration, severity=warning, status=unread

### Requirement: Alert Generation Service

Alerts SHALL be generated via event hooks and a scan endpoint. Generation MUST be idempotent — duplicate source references MUST upsert, not create duplicates.

#### Scenario: Idempotent generation

- GIVEN an existing alert for sourceType=document, sourceId=doc-1
- WHEN the same alert is generated again
- THEN the existing alert is updated, no duplicate created

### Requirement: Alert CRUD API

Routes under `/api/projects/{projectId}/alerts/`. Project membership enforced.

| Method | Path | Description |
|--------|------|-------------|
| GET | /alerts | List with filters (type, severity, status) |
| GET | /alerts/[alertId] | Get single alert |
| PATCH | /alerts/[alertId]/acknowledge | Mark acknowledged |
| PATCH | /alerts/[alertId]/dismiss | Mark dismissed |
| POST | /alerts/scan | Trigger time-based scan |

#### Scenario: List filtered by severity

- GIVEN alerts with severities info, warning, critical
- WHEN GET /alerts?severity=warning
- THEN only warning alerts return

#### Scenario: Acknowledge alert

- GIVEN an unread alert
- WHEN PATCH /alerts/[id]/acknowledge
- THEN status changes to acknowledged, updatedAt refreshes

#### Scenario: Dismiss alert

- GIVEN an unread or acknowledged alert
- WHEN PATCH /alerts/[id]/dismiss
- THEN status changes to dismissed

### Requirement: Alert Scan Endpoint

POST /alerts/scan SHALL generate alerts for: documents expiring within 30/14/7/1 days, and upcoming recurring events within 7 days. MUST return count of generated/updated alerts.

#### Scenario: Scan generates expiration alerts

- GIVEN documents expiring in 14 and 3 days
- WHEN scan is triggered
- THEN alerts are generated/updated for both documents

### Requirement: Unread Count

GET /alerts/unread-count SHALL return `{ count: number }` for the authenticated user's project context.

#### Scenario: Unread count

- GIVEN 5 unread alerts in a project
- WHEN GET /alerts/unread-count
- THEN response is `{ count: 5 }`
