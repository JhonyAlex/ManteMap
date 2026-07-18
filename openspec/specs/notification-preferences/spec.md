# Notification Preferences Specification

## Purpose

Per-user, per-project control over which alert types are active, their severity thresholds, and per-channel delivery toggles for external notifications.

## Requirements

### Requirement: NotificationPreference Model

The system SHALL store preferences per user+project+alertType with toggles for each alert type, minimum severity threshold, and per-channel delivery booleans.

| Field | Type | Required |
|-------|------|----------|
| userId | FK | Yes |
| projectId | FK | Yes |
| alertType | AlertType enum | Yes |
| enabled | Boolean | Yes (default: true) |
| minSeverity | Severity enum | Yes (default: info) |
| email | Boolean | Yes (default: false) |
| slack | Boolean | Yes (default: false) |
| teams | Boolean | Yes (default: false) |
| telegram | Boolean | Yes (default: false) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

Unique constraint: `@@unique([userId, projectId, alertType])`

#### Scenario: Default preferences on project join

- GIVEN a user joining a project
- WHEN preferences are auto-seeded
- THEN all alert types are enabled, minSeverity=info, all channels=false

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
- THEN defaults are returned (all enabled, minSeverity=info, all channels=false)

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

Preferences SHALL be accessible from the alerts dashboard page. Toggle switches for each alert type, dropdown for min severity, and per-channel toggle columns.

#### Scenario: Toggle alert type off

- GIVEN the preferences UI
- WHEN user disables "Status Change" toggle
- THEN statusChange saves as false

### Requirement: Channel Boolean Fields on NotificationPreference

The `NotificationPreference` model SHALL add `email`, `slack`, `teams`, `telegram` Boolean fields with `@default(false)`. Existing rows SHALL migrate with all channels `false` — opt-in only, no behavioral change.

#### Scenario: New preference defaults to all channels off
- GIVEN a user joins a project
- WHEN preferences are auto-seeded
- THEN `email`, `slack`, `teams`, `telegram` are all `false`; `enabled` is `true`

#### Scenario: Existing preferences migrate safely
- GIVEN existing NotificationPreference rows without channel columns
- WHEN migration applies
- THEN all rows get `email=false, slack=false, teams=false, telegram=false`; no data loss

### Requirement: API Accepts Channel Toggles

The PUT `/preferences` endpoint SHALL accept `email`, `slack`, `teams`, `telegram` boolean fields alongside existing `enabled` and alert type fields. The GET endpoint SHALL return channel fields in the response.

#### Scenario: Update channel preferences
- GIVEN user with default preferences (all channels false)
- WHEN PUT `/preferences` with `{ email: true, slack: false }`
- THEN `email=true`, `slack=false` persisted; other channels unchanged

#### Scenario: Backward compatible — omit channel fields
- GIVEN existing preferences
- WHEN PUT `/preferences` with `{ enabled: false }` (no channel fields)
- THEN `enabled` updated; channel fields retain current values

### Requirement: Channel Toggle UI Column

The preferences UI SHALL show a per-channel toggle column (`email`, `slack`, `teams`, `telegram`) next to each alert type row in the existing `NotificationPreferences` component.

#### Scenario: User enables Slack for DOCUMENT_EXPIRING
- GIVEN the preferences page with channel toggle columns visible
- WHEN user toggles Slack on for the `DOCUMENT_EXPIRING` row
- THEN `slack=true` saved via PUT API; toggle reflects new state after save

#### Scenario: Toggle disabled state when channel not configured
- GIVEN user has no Slack webhook configured
- WHEN rendering the Slack toggle column
- THEN toggle is disabled with tooltip "Configure Slack webhook first"
