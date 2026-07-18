# Configurable Statuses Specification

## Requirement: Nested lifecycle under parent ItemType

Statuses MUST belong to exactly one ItemType. All operations MUST be scoped through nested routes. Cascade deletion from ItemType MUST remove associated statuses.

### Scenario: Create status for non-existent ItemType
- GIVEN a project owner
- WHEN a status is created under a fabricated ItemType ID
- THEN the API returns `404`

## Requirement: Project-scoped access through parent ItemType

Access MUST be transitively scoped: caller MUST be a project member. Non-members MUST receive `404`. Non-owner members MUST receive `403` on mutations. Members MAY read.

### Scenario: Non-member denied
- GIVEN an ItemType in project A
- WHEN a non-member requests its statuses
- THEN the API returns `404`

### Scenario: Non-owner mutation denied
- GIVEN a non-owner project member
- WHEN they attempt to create, update, delete, or reorder statuses
- THEN the API returns `403`

## Requirement: Per-ItemType code uniqueness

`code` MUST be unique within its parent ItemType. Same code MAY exist across different ItemTypes. Duplicate codes MUST return `409`.

### Scenario: Duplicate code rejected
- GIVEN an ItemType with `code: "active"`
- WHEN another status with the same code is created under the same ItemType
- THEN the API returns `409`

### Scenario: Same code across ItemTypes succeeds
- GIVEN ItemType A has `code: "active"`
- WHEN ItemType B creates a status with the same code
- THEN creation succeeds

## Requirement: Hex color validation

`color` MUST be a valid hex color in `#RGB` or `#RRGGBB` format. Invalid colors MUST return `400`.

### Scenario: Invalid color rejected
- GIVEN a project owner creating a status
- WHEN input includes `color: "blue"`
- THEN the API returns `400`

## Requirement: Icon field

`icon` MAY be an optional string (emoji or icon name). Absence MUST NOT fail validation.

### Scenario: Create status with icon
- GIVEN a project owner creating a status with `icon: "🔧"`
- WHEN the status is created
- THEN the icon persists and is returned in responses

## Requirement: Single default per ItemType

Exactly one status per ItemType MAY be marked as default. Creating or updating a status with `isDefault: true` MUST unset any previous default within the same ItemType via a service-layer transaction.

### Scenario: New default un-sets previous
- GIVEN an ItemType with a default status "Open"
- WHEN owner creates "In Progress" with `isDefault: true`
- THEN "Open".isDefault becomes `false` and "In Progress".isDefault becomes `true`

## Requirement: Status ordering

Statuses MUST have an integer `order` column. Reorder endpoint MUST accept ordered status ID array and update values atomically. List responses MUST return statuses ascending by `order`.

### Scenario: Reorder via PUT
- GIVEN an ItemType with statuses A, B, C at orders 0, 1, 2
- WHEN `PUT .../statuses/reorder` receives `{ "statusIds": ["C", "A", "B"] }`
- THEN C→0, A→1, B→2

## Requirement: Non-destructive deactivation

DELETE MUST set `active` to `false`, retaining the record. Deactivated statuses MUST be excluded from list. Mutating a deactivated status MUST return `404`.

### Scenario: Deactivated status excluded from list
- GIVEN a status deactivated via DELETE
- WHEN listing active statuses
- THEN the deactivated status is not returned

### Scenario: Deactivated status rejects mutation
- GIVEN a status deactivated via DELETE
- WHEN owner attempts update
- THEN the API returns `404`

## Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Malformed JSON MUST return `400`. Prisma errors MUST map to safe envelopes never exposing DB internals.

### Scenario: Malformed JSON
- GIVEN a create status request
- WHEN body is not valid JSON
- THEN the API returns `400` with a non-leaking message

## Requirement: Status transition validation

Status transitions on items MUST enforce `isFinal` semantics: items in a final status MUST NOT allow further status changes. Transitioning to a non-existent or deactivated status MUST return `400`.

### Scenario: Final status blocks transition
- GIVEN an item with status "Completed" where `isFinal: true`
- WHEN a status transition to "Open" is attempted
- THEN the API returns `400` with message indicating final status

### Scenario: Valid transition allowed
- GIVEN an item with status "Open" where `isFinal: false`
- WHEN a status transition to "In Progress" is attempted
- THEN the item's statusId updates to "In Progress"

### Scenario: Transition to deactivated status rejected
- GIVEN a status "Legacy" that has been deactivated
- WHEN a status transition to "Legacy" is attempted
- THEN the API returns `400`

## Requirement: isBlocking flag semantics

Items in a status with `isBlocking: true` MUST be flagged as blocked. The list endpoint SHOULD support filtering by `isBlocking` status.

### Scenario: Blocking status identifiable
- GIVEN a status "On Hold" with `isBlocking: true`
- WHEN an item transitions to "On Hold"
- THEN the item is in a blocking status

## Requirement: isIncident flag semantics

Items in a status with `isIncident: true` MUST be flagged as incident. The list endpoint SHOULD support filtering by `isIncident` status.

### Scenario: Incident status identifiable
- GIVEN a status "Broken" with `isIncident: true`
- WHEN an item transitions to "Broken"
- THEN the item is in an incident status

## Requirement: Default status assignment on ItemType change

When an item's ItemType changes (if supported), the item's status MUST reset to the new ItemType's default status. If no default exists, status MUST be set to `null`.

### Scenario: Reset on type change
- GIVEN an item of type A with status "Active"
- WHEN the item is moved to type B with default status "New"
- THEN the item's status becomes "New"

## Deferred Requirements

Status transition rules (`isFinal`, `isBlocking`, `isIncident`) are now implemented for item lifecycle validation. Item-to-Status FK is active. Transition history and workflow engine remain deferred.

## Requirement: Status transitions render as DropdownMenu

The item detail page MUST render available status transitions as a `DropdownMenu` component. The current status MUST be displayed as a Badge. Menu items MUST show the target status name, color indicator, and icon if present.

### Scenario: Dropdown shows available transitions

- GIVEN an item with status "Open" and valid transitions to "In Progress" (icon: 🔄) and "On Hold"
- WHEN the detail page renders
- THEN a dropdown button shows "Open" badge, and menu lists "In Progress 🔄" and "On Hold"

### Scenario: Empty transitions show disabled dropdown

- GIVEN an item with status "Completed" where isFinal=true
- WHEN the detail page renders
- THEN the transition dropdown is disabled with no menu items

## Requirement: Final status disables transition actions

Items in a status where `isFinal=true` MUST disable the status transition dropdown. The dropdown MUST visually indicate disabled state.

### Scenario: Final status prevents transition UI

- GIVEN an item with status "Completed" (isFinal=true)
- WHEN a user views the detail page
- THEN the status dropdown is disabled and no transition options are clickable

## Requirement: Transition errors display as toast notifications

Status transition API errors MUST display as toast notifications. HTTP 409 (conflict) MUST show "Item status has changed. Refresh and retry." HTTP 404 (not found) MUST show "Status no longer exists." Generic errors MUST show the server message.

### Scenario: 409 conflict toast

- GIVEN an item where another user changed the status concurrently
- WHEN the current user attempts a transition and receives 409
- THEN a toast displays "Item status has changed. Refresh and retry."

### Scenario: 404 status not found toast

- GIVEN a status that was deactivated between page load and transition attempt
- WHEN the transition API returns 404
- THEN a toast displays "Status no longer exists."

### Scenario: Generic error toast

- GIVEN a transition attempt
- WHEN the API returns 500 with message "Internal server error"
- THEN a toast displays "Internal server error"
