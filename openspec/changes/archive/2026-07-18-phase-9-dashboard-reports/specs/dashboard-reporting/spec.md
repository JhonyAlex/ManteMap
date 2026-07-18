# Dashboard & Reporting Specification

## Purpose

Operational dashboard with project/global KPIs, bounded activity timeline, and authorized CSV exports.

## Non-Goals

Real-time refresh; charts/PDF/scheduled reports; unified audit-log; schema changes.

---

## Requirements

### Requirement: Project Dashboard Metrics

The system SHALL provide a project-scoped dashboard accessible only to authorized members. It MUST display: items by status, active alerts by severity, total documents, documents expiring within 30 days, upcoming events, and total locations.

#### Scenario: Authorized member views project dashboard

- GIVEN a signed-in member of project "Alpha"
- WHEN the user navigates to the project dashboard
- THEN all six metric groups display current counts

#### Scenario: Non-member cannot access project dashboard

- GIVEN a signed-in user who is NOT a member of project "Alpha"
- WHEN the user attempts to access the project dashboard
- THEN the system returns an authorization error with no metric data

### Requirement: Cross-Project Summary Dashboard

The system SHALL provide a global dashboard aggregating metrics across all projects accessible to the signed-in user.

#### Scenario: User sees cross-project summary

- GIVEN a signed-in member of projects "Alpha" and "Beta"
- WHEN the user navigates to the global dashboard
- THEN per-project summaries (items, alerts, expiring documents) display for both only

#### Scenario: User with no projects sees empty state

- GIVEN a signed-in user with zero project memberships
- WHEN the user navigates to the global dashboard
- THEN an empty state indicates no projects available

### Requirement: Bounded Activity Timeline

The system SHALL display a recent-activity timeline sourced from items, document versions, alerts, and events. It MUST be capped and ordered newest-first.

#### Scenario: Timeline shows recent activity

- GIVEN project "Alpha" has recent activity across all four sources
- WHEN an authorized member views the dashboard
- THEN merged entries display, ordered by timestamp descending, up to cap

#### Scenario: Timeline with no recent activity

- GIVEN project "Alpha" has no activity within the window
- WHEN an authorized member views the dashboard
- THEN the timeline displays an empty state message

### Requirement: CSV Export with Access Control

The system SHALL allow authorized members to export items, documents, and alerts as CSV. The endpoint MUST enforce project membership server-side.

#### Scenario: Authorized member downloads CSV

- GIVEN a signed-in member of project "Alpha"
- WHEN the user requests a CSV export for items
- THEN a file with Content-Type text/csv and Content-Disposition attachment headers is returned with project-scoped rows only

#### Scenario: Non-member cannot download CSV

- GIVEN a signed-in user who is NOT a member of project "Alpha"
- WHEN the user requests a CSV export for project "Alpha"
- THEN the system returns an authorization error with no file content

### Requirement: CSV Injection Prevention

All CSV fields MUST be escaped to prevent formula injection. Fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` SHALL be prefixed with a single quote.

#### Scenario: Dangerous field values are escaped

- GIVEN a document with name "=cmd|'/C calc'!A1"
- WHEN the user exports documents as CSV
- THEN the exported value starts with `'` prefix

### Requirement: Dashboard UI States

The dashboard MUST display a loading skeleton while fetching. Each metric group SHALL show an empty state when no data exists. All components MUST support keyboard navigation and ARIA labels.

#### Scenario: Loading state renders skeleton

- GIVEN a user navigates to the project dashboard
- WHEN metrics are being fetched
- THEN skeleton placeholders display for each metric group

#### Scenario: Zero count shows empty state

- GIVEN project "Alpha" has zero documents
- WHEN an authorized member views the dashboard
- THEN the documents group displays zero with an empty indicator

---

## Constraints

- Metric queries MUST use bounded windows and grouped counts.
- Dashboard MUST NOT introduce client-side polling; data is fetched once via Server Components.
- CSV exports MUST NOT include data from unauthorized projects.
