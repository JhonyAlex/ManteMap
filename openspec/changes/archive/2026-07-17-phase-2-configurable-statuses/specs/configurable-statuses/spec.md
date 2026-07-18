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

## Deferred Requirements

Status transition rules (`isFinal`, `isBlocking`, `isIncident`), Item-to-Status FK (Phase 3), transition history, and workflow engine are deferred. The three deferred boolean columns exist in the schema but are excluded from Zod schemas and API surface.
