# Dynamic Field Management Specification

## Requirement: Nested lifecycle under parent ItemType

Fields MUST belong to exactly one ItemType with no independent lifecycle. All operations MUST be scoped through nested routes. Cascade deletion from ItemType MUST remove associated fields.

### Scenario: Create field for non-existent ItemType

- GIVEN a project owner
- WHEN a field is created under a fabricated ItemType ID
- THEN the API returns `404`

## Requirement: Project-scoped access through parent ItemType

Access MUST be transitively scoped: caller MUST be a project member. Non-members, including `ADMIN` without membership, MUST receive `404`. Non-owner members MUST receive `403` on mutations.

### Scenario: Non-member denied

- GIVEN an ItemType in project A
- WHEN a non-member requests its fields
- THEN the API returns `404`

### Scenario: Non-owner mutation denied

- GIVEN a non-owner project member
- WHEN they attempt to create, update, or delete a field
- THEN the API returns `403`

## Requirement: 18 supported field types

MUST support: SHORT_TEXT, LONG_TEXT, NUMBER, DECIMAL, CURRENCY, BOOLEAN, DATE, DATETIME, SELECT, MULTI_SELECT, URL, EMAIL, PHONE, FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION. Type stored as DB enum, validated at creation. Unknown types MUST return `400`.

### Scenario: Reject unknown field type

- GIVEN a project owner creating a field
- WHEN input includes `type: "CUSTOM_TYPE"`
- THEN the API returns `400`

## Requirement: Per-ItemType key uniqueness

`key` MUST be unique within its parent ItemType. Same key MAY exist across different ItemTypes. Duplicate keys MUST return `409`.

### Scenario: Duplicate key rejected

- GIVEN an ItemType with `key: "serial_number"`
- WHEN another field with the same key is created under the same ItemType
- THEN the API returns `409`

### Scenario: Same key across ItemTypes succeeds

- GIVEN ItemType A has `key: "serial_number"`
- WHEN ItemType B creates a field with the same key
- THEN creation succeeds

## Requirement: Field ordering

Fields MUST have an integer `order` column. Reorder endpoint MUST accept ordered field ID array and update values atomically. Fields MUST return ascending by default.

### Scenario: Reorder via PUT

- GIVEN an ItemType with fields A, B, C at 0, 1, 2
- WHEN `PUT .../fields/reorder` receives `{ "fieldIds": ["C", "A", "B"] }`
- THEN C→0, A→1, B→2

## Requirement: Required flag

Each field MUST have a `required` boolean defaulting to `false`.

## Requirement: Field-specific options

SELECT and MULTI_SELECT MUST include an `options` array of `{label, value}` stored as JSON. Omitting options for these types MUST return `400`.

### Scenario: SELECT without options rejected

- GIVEN a project owner creating a SELECT field
- WHEN submitted without `options`
- THEN the API returns `400`

## Requirement: Validation rules

MUST support optional `validation` JSON with per-type rules (`min`/`max` for NUMBER, `pattern` for SHORT_TEXT). Service layer MUST validate rules match field type. Malformed JSON MUST return `400`.

### Scenario: NUMBER with range

- GIVEN creating a NUMBER field with `validation: { min: 0, max: 100 }`
- WHEN the field is created
- THEN validation rules persist intact

## Requirement: Non-destructive deactivation

DELETE MUST set `active` to `false`, retaining the record. Deactivated fields MUST be excluded from list. Mutating a deactivated field MUST return `404`.

### Scenario: Deactivated field rejects mutation

- GIVEN a field deactivated via DELETE
- WHEN owner attempts update
- THEN the API returns `404`

## Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Malformed JSON MUST return `400`. Prisma errors MUST map to safe envelopes never exposing DB internals.

### Scenario: Malformed JSON

- GIVEN a create field request
- WHEN body is not valid JSON
- THEN the API returns `400` with a non-leaking message

## Deferred Requirements

Form generation, field value storage (EAV/JSONB), field deletion after Items exist, and `createFieldValueSchema` factory are deferred to Phase 3 and Slice 4.
