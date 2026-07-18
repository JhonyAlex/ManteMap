# Delta for Configurable Statuses

## ADDED Requirements

### Requirement: Status transition validation

Status transitions on items MUST enforce `isFinal` semantics: items in a final status MUST NOT allow further status changes. Transitioning to a non-existent or deactivated status MUST return `400`.

#### Scenario: Final status blocks transition

- GIVEN an item with status "Completed" where `isFinal: true`
- WHEN a status transition to "Open" is attempted
- THEN the API returns `400` with message indicating final status

#### Scenario: Valid transition allowed

- GIVEN an item with status "Open" where `isFinal: false`
- WHEN a status transition to "In Progress" is attempted
- THEN the item's statusId updates to "In Progress"

#### Scenario: Transition to deactivated status rejected

- GIVEN a status "Legacy" that has been deactivated
- WHEN a status transition to "Legacy" is attempted
- THEN the API returns `400`

### Requirement: isBlocking flag semantics

Items in a status with `isBlocking: true` MUST be flagged as blocked. The list endpoint SHOULD support filtering by `isBlocking` status.

#### Scenario: Blocking status identifiable

- GIVEN a status "On Hold" with `isBlocking: true`
- WHEN an item transitions to "On Hold"
- THEN the item is in a blocking status

### Requirement: isIncident flag semantics

Items in a status with `isIncident: true` MUST be flagged as incident. The list endpoint SHOULD support filtering by `isIncident` status.

#### Scenario: Incident status identifiable

- GIVEN a status "Broken" with `isIncident: true`
- WHEN an item transitions to "Broken"
- THEN the item is in an incident status

### Requirement: Default status assignment on ItemType change

When an item's ItemType changes (if supported), the item's status MUST reset to the new ItemType's default status. If no default exists, status MUST be set to `null`.

#### Scenario: Reset on type change

- GIVEN an item of type A with status "Active"
- WHEN the item is moved to type B with default status "New"
- THEN the item's status becomes "New"

## MODIFIED Requirements

### Requirement: Deferred Requirements

Status transition rules (`isFinal`, `isBlocking`, `isIncident`), Item-to-Status FK, transition history, and workflow engine. The three deferred boolean columns now participate in item lifecycle validation. Transition history and workflow engine remain deferred.

(Previously: All transition rules and Item-to-Status FK were fully deferred; boolean columns excluded from API surface)
