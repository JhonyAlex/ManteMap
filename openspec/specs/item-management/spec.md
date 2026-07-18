# Item Management Specification

## Purpose

Item CRUD lifecycle — create, read, update, delete items with EAV field values. Project-scoped access. Slug uniqueness per ItemType. Status assignment on create. List with filters and detail/edit via DynamicForm. QR display and PDF export on item detail.

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

List endpoint MUST support filtering by `itemTypeId`, `statusId`, `locationId`, and text `search` (matching name). MUST support pagination via `page` and `pageSize`. Field values for `showInList` DynamicFields MUST be batch-loaded in a single query. Response MUST include `location` object when `locationId` is populated.

#### Scenario: Filter by type and status

- GIVEN items of types A and B with various statuses
- WHEN listing with `?itemTypeId=A&statusId=active`
- THEN only items matching both filters return

#### Scenario: Filter by location

- GIVEN items across multiple locations
- WHEN listing with `?locationId=room-101-id`
- THEN only items assigned to that location return

#### Scenario: Item includes location in response

- GIVEN an item with `locationId` pointing to "Room 101"
- WHEN the list endpoint is called
- THEN the item response includes `location: { id, name, path }`

#### Scenario: Text search

- GIVEN items "Pump A" and "Valve B"
- WHEN listing with `?search=pump`
- THEN only "Pump A" returns

### Requirement: Item detail with field values

Detail endpoint MUST return the item with all its field values hydrated. Each field value MUST include the DynamicField definition for rendering. Response MUST include the full location object with path when `locationId` is populated.

#### Scenario: Detail returns hydrated values

- GIVEN an item with field values for `name` and `quantity`
- WHEN the detail endpoint is called
- THEN the response includes field definitions, values, and location

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

### Requirement: List page derives columns from showInList fields

The items list page MUST derive table columns exclusively from DynamicFields where `showInList` is `true`. Column headers MUST use the field's `label` property. Column order MUST follow the field `order` property.

#### Scenario: Only showInList fields appear as columns

- GIVEN an ItemType "Pump" with fields: name (showInList=true, order=1), serialNumber (showInList=true, order=2), notes (showInList=false)
- WHEN the items list page renders
- THEN the table displays "Name" and "Serial Number" columns only

#### Scenario: Column order matches field order

- GIVEN fields with order: serialNumber (1), name (2), both showInList=true
- WHEN the list page renders
- THEN serialNumber is the first column, name is the second

### Requirement: Detail page renders field values by type

The item detail page MUST render each field value using the appropriate type-specific component from the field registry. Unknown types MUST render as plain text fallback.

#### Scenario: Number field renders as formatted number

- GIVEN an item with field value `{ dynamicFieldId: "qty", value: "1500" }` where field type is NUMBER
- WHEN the detail page renders
- THEN the value displays as "1,500" (locale-formatted)

#### Scenario: Unknown type falls back to text

- GIVEN an item with a field value for an unregistered field type
- WHEN the detail page renders
- THEN the raw string value displays as plain text

### Requirement: Create/edit wraps DynamicForm with value transformation

Create and edit pages MUST wrap `DynamicForm`. On submit, field values MUST transform from `{ [fieldId]: value }` to `[{ dynamicFieldId, value }]` array format. On edit load, values MUST transform from EAV array to flat object for form pre-population. `locationId` MUST be included as a top-level field separate from EAV values.

#### Scenario: Submit transforms to EAV format

- GIVEN form values `{ "field-1": "Widget", "field-2": 42 }`
- WHEN the form submits
- THEN the API receives `[{ dynamicFieldId: "field-1", value: "Widget" }, { dynamicFieldId: "field-2", value: 42 }]`

#### Scenario: Edit pre-populates from EAV

- GIVEN an item with field values `[{ dynamicFieldId: "field-1", value: "Widget" }]`
- WHEN the edit page loads
- THEN the form field "field-1" shows "Widget"

#### Scenario: Location field pre-populates

- GIVEN an item with `locationId: "room-101-id"`
- WHEN the edit page loads
- THEN the LocationPicker shows "Room 101" with full path

### Requirement: Status Transition Alert Generation

The system SHALL generate alerts when `transitionStatus()` moves an item to an incident, blocking, or final status. Alert severity SHALL map from the status configuration. Generation MUST be idempotent.

#### Scenario: Alert on incident status transition

- GIVEN an item with status "Active"
- WHEN status transitions to "Incident" (isIncident=true)
- THEN a critical-severity alert is generated with alertType=status_change

#### Scenario: Alert on blocking status transition

- GIVEN an item
- WHEN status transitions to a status where isBlocking=true
- THEN a warning-severity alert is generated

#### Scenario: No alert on normal transition

- GIVEN an item with status "Inactive"
- WHEN status transitions to "Active"
- THEN no alert is generated (neither incident, blocking, nor final)

### Requirement: QR code display on item detail

The item detail page MUST include a "Show QR" button that displays the item's QR code in a modal/dialog. The QR image SHALL be fetched from the QR generation API. A "Print QR" action MUST trigger browser print for the QR code only.

#### Scenario: Open QR modal from item detail

- GIVEN an item detail page for "Pump A"
- WHEN the user clicks "Show QR"
- THEN a modal displays the QR code image (from API) with item name label beneath it

#### Scenario: Print QR from modal

- GIVEN the QR modal is open
- WHEN the user clicks "Print QR"
- THEN the browser print dialog opens with only the QR code + label visible

#### Scenario: QR unavailable handles gracefully

- GIVEN the QR API returns an error
- WHEN the user clicks "Show QR"
- THEN the modal shows "QR code unavailable" with a retry button

### Requirement: PDF export action on item detail

The item detail page MUST include a "Export PDF" button that triggers download of the item sheet PDF. The download SHALL be initiated via the PDF export API route. While downloading, the button MUST show a loading state.

#### Scenario: Export PDF from item detail

- GIVEN an item detail page
- WHEN the user clicks "Export PDF"
- THEN the browser downloads a PDF file named `{item-slug}.pdf` with the item sheet content

#### Scenario: PDF download loading state

- GIVEN the user clicks "Export PDF"
- WHEN the PDF is being generated server-side
- THEN the button shows a spinner and is disabled until download starts
