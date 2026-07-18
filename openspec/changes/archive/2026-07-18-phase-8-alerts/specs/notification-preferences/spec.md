# Notification Preferences Specification

## Purpose

Per-user, per-project control over which alert types are active and their severity thresholds.

## Requirements

### Requirement: NotificationPreference Model

The system SHALL store preferences per user+project with toggles for each alert type and minimum severity threshold.

| Field | Type | Required |
|-------|------|----------|
| userId | FK | Yes |
| projectId | FK | Yes |
| documentExpiration | boolean | Yes (default: true) |
| statusChange | boolean | Yes (default: true) |
| upcomingEvent | boolean | Yes (default: true) |
| minSeverity | enum (info, warning, critical) | Yes (default: info) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Unique constraint: `@@unique([userId, projectId])`

#### Scenario: Default preferences on project join

- GIVEN a user joining a project
- WHEN preferences are auto-seeded
- THEN all alert types are enabled, minSeverity=info

### Requirement: Preferences CRUD API

Routes under `/api/projects/{projectId}/preferences/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | /preferences | Get current user's preferences |
| PUT | /preferences | Update preferences |

#### Scenario: Update preferences

- GIVEN a user with default preferences
- WHEN PUT /preferences `{ documentExpiration: false, minSeverity: "warning" }`
- THEN documentExpiration is disabled, only warning+ alerts fire

#### Scenario: Get preferences returns defaults

- GIVEN a user with no saved preferences
- WHEN GET /preferences
- THEN defaults are returned (all enabled, minSeverity=info)

### Requirement: Alert Filtering by Preferences

Alert generation SHALL check user preferences before persisting. If the alert type is disabled for the user or severity is below threshold, the alert MUST NOT be created for that user's context.

#### Scenario: Disabled type skips alert

- GIVEN a user with documentExpiration=false
- WHEN a document expiration alert is generated
- THEN no alert is created for that user's project context

#### Scenario: Severity below threshold skipped

- GIVEN a user with minSeverity=warning
- WHEN an info-severity alert is generated
- THEN no alert is created

### Requirement: Preferences UI

Preferences SHALL be accessible from the alerts dashboard page. Toggle switches for each alert type, dropdown for min severity.

#### Scenario: Toggle alert type off

- GIVEN the preferences UI
- WHEN user disables "Status Change" toggle
- THEN statusChange saves as false
