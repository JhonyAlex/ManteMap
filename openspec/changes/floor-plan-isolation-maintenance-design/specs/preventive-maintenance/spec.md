# Preventive Maintenance Specification

## Purpose

Define durable, project-scoped preventive maintenance separately from display-only calendar recurrence.

## Requirements

### Requirement: Project scheduling configuration

Each Project MUST have a required, validated IANA `timezone` (initial default `Europe/Madrid`) and `maintenanceGenerationHorizonDays` defaulting to 90, configurable only from 30 through 365. A MaintenancePlan MUST reference one Item during the MVP.

#### Scenario: Reject invalid scheduling configuration

- GIVEN a project administrator
- WHEN they submit an unknown timezone or a horizon outside 30–365
- THEN validation rejects the change

### Requirement: Durable occurrence identity and status

Each generated WorkOrder MUST copy its plan checklist and be unique by `(maintenancePlanId, occurrenceKey)`. Stored statuses MUST be only `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `CANCELLED`. Overdue MUST be derived when `dueAt` (or `scheduledAt` when no due time exists) is past and status is nonterminal.

#### Scenario: Concurrent generation is idempotent

- GIVEN two generators calculate the same occurrence
- WHEN both attempt persistence
- THEN exactly one WorkOrder exists for its occurrence key

#### Scenario: Derive overdue without persisted status

- GIVEN a past-due PENDING or IN_PROGRESS order
- WHEN it is queried
- THEN it is reported overdue without storing `OVERDUE`

### Requirement: Hourly generation and recovery

An idempotent generator MUST run hourly in project local time and fill the configured horizon. It MUST automatically recover missing occurrences from the last 30 days as overdue. Older missed occurrences MUST require an explicit audited backfill or discard; discard MUST retain durable occurrence evidence.

#### Scenario: Recover a recent missed occurrence

- GIVEN an occurrence 10 days old has no WorkOrder
- WHEN the hourly generator runs
- THEN it creates one overdue-derived order and records the generation run

#### Scenario: Older recovery requires a decision

- GIVEN an occurrence 31 or more days old is missing
- WHEN automatic generation runs
- THEN no order is silently created or discarded
- AND explicit backfill or audited cancellation is required

### Requirement: Effective plan changes preserve work

MaintenancePlan MUST be a stable identity with immutable, effective-dated revisions. Each generation, recovery, or explicit backfill MUST select the latest revision effective at the occurrence date and copy that revision's definition and checklist into the WorkOrder. Plan changes create a new prospective revision; they MUST NOT update prior revisions or WorkOrders. COMPLETED orders MUST be immutable. IN_PROGRESS orders MUST NOT change automatically. Future PENDING orders MUST remain unchanged unless an administrator explicitly confirms an audited cancellation and regeneration.

#### Scenario: Edit plan prospectively

- GIVEN completed, in-progress, and future pending orders exist
- WHEN a plan revision becomes effective
- THEN none of those orders changes automatically
- AND only new occurrences use the revised checklist

#### Scenario: Backfill selects the historical effective revision

- GIVEN a plan has revision A effective 1 January and revision B effective 1 July
- WHEN an administrator backfills a missing 15 June occurrence
- THEN its WorkOrder copies revision A's definition and checklist
- AND a 15 July occurrence copies revision B's definition and checklist

### Requirement: Maintenance permissions

OWNER and MANAGER MUST administer plans and confirm reprogramming. TECHNICIAN MUST query, start, and complete only permitted orders. VIEWER MUST be read-only. Until role normalization, business TECHNICIAN maps to stored `ProjectRole.MEMBER`.

#### Scenario: Viewer cannot transition an order

- GIVEN a VIEWER can read a work order
- WHEN they try to start or complete it
- THEN authorization is denied and no activity is recorded
