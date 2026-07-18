# Item Management Specification

## Purpose

Item CRUD lifecycle — create, read, update, delete items with EAV field values. Project-scoped access. Slug uniqueness per ItemType. Status assignment on create. List with filters and detail/edit via DynamicForm.

## Requirements

### Requirement: Nested lifecycle under parent ItemType

Items MUST belong to exactly one ItemType. All operations MUST be scoped through nested routes under `/api/projects/{projectId}/items/`. Cascade deletion from ItemType MUST remove associated items and their field values.

#### Scenario: Create item for non-existent ItemType

- GIVEN a project member
- WHEN an item is created with a fabricated itemTypeId
- THEN the API returns `404`

### Requirement: Project-scoped access

Caller MUST be a project member. Non-members MUST receive `404`. Non-owner members MUST receive `403` on mutations (create, update, delete). Members MAY read and list.

#### Scenario: Non-member denied

- GIVEN an ItemType in project A
- WHEN a non-member requests items
- THEN the API returns `404`

#### Scenario: Non-owner mutation denied

- GIVEN a non-owner project member
- WHEN they attempt to create, update, or delete an item
- THEN the API returns `403`

### Requirement: EAV field value storage

Items MUST store dynamic field values as EAV records with `dynamicFieldId` FK and `value Json?`. Field values MUST validate against the parent ItemType's DynamicField definitions using `createFieldValueSchema`. Unknown field IDs MUST return `400`.

#### Scenario: Create item with field values

- GIVEN an ItemType with fields `name` (SHORT_TEXT) and `quantity` (NUMBER)
- WHEN an item is created with `{ name: "Widget", quantity: 42 }`
- THEN the item and two ItemFieldValue records persist

#### Scenario: Unknown field ID rejected

- GIVEN an ItemType with field `name`
- WHEN an item is created with field value referencing a fabricated field ID
- THEN the API returns `400`

### Requirement: Slug auto-generation with conflict resolution

Each item MUST have a `slug` unique within its ItemType (`@@unique([itemTypeId, slug])`). Slug MUST auto-generate from the item's display name. On conflict, a numeric suffix SHALL be appended (e.g., `widget-2`).

#### Scenario: Auto-generated slug

- GIVEN an ItemType with no items
- WHEN an item named "Industrial Pump" is created
- THEN slug is `industrial-pump`

#### Scenario: Slug conflict resolution

- GIVEN an ItemType with item slug `widget`
- WHEN another item named "Widget" is created
- THEN slug is `widget-2`

### Requirement: Status assignment on create

Items MUST have a nullable `statusId`. On create, if `statusId` is omitted, the ItemType's default status SHALL be assigned. If no default status exists, `statusId` remains `null`.

#### Scenario: Default status auto-assigned

- GIVEN an ItemType with default status "Active"
- WHEN an item is created without specifying statusId
- THEN the item has statusId pointing to "Active"

#### Scenario: Explicit status on create

- GIVEN an ItemType with statuses "Active" and "Inactive"
- WHEN an item is created with statusId = "Inactive"
- THEN the item has statusId pointing to "Inactive"

### Requirement: Item list with filters

List endpoint MUST support filtering by `itemTypeId`, `statusId`, and text `search` (matching name). MUST support pagination via `page` and `pageSize`. Field values for `showInList` DynamicFields MUST be batch-loaded in a single query.

#### Scenario: Filter by type and status

- GIVEN items of types A and B with various statuses
- WHEN listing with `?itemTypeId=A&statusId=active`
- THEN only items matching both filters return

#### Scenario: Text search

- GIVEN items "Pump A" and "Valve B"
- WHEN listing with `?search=pump`
- THEN only "Pump A" returns

### Requirement: Item detail with field values

Detail endpoint MUST return the item with all its field values hydrated. Each field value MUST include the DynamicField definition for rendering.

#### Scenario: Detail returns hydrated values

- GIVEN an item with field values for `name` and `quantity`
- WHEN the detail endpoint is called
- THEN the response includes field definitions and values

### Requirement: Update item fields

Update endpoint MUST accept partial field values. Provided values MUST validate against DynamicField definitions. Unprovided fields MUST retain their current values.

#### Scenario: Partial update

- GIVEN an item with name="Widget" and quantity=10
- WHEN update sends `{ quantity: 20 }`
- THEN name remains "Widget" and quantity becomes 20

### Requirement: Delete item

DELETE MUST remove the item and cascade-delete all ItemFieldValue records. MUST return `204`.

#### Scenario: Cascade delete

- GIVEN an item with 5 field values
- WHEN the item is deleted
- THEN the item and all 5 field values are removed

### Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Malformed JSON MUST return `400`. Prisma errors MUST map to safe envelopes never exposing DB internals.

#### Scenario: Malformed JSON

- GIVEN a create item request
- WHEN body is not valid JSON
- THEN the API returns `400` with a non-leaking message
