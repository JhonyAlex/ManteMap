# Delta for Item Management

## MODIFIED Requirements

### Requirement: Item list with filters

List endpoint MUST support filtering by `itemTypeId`, `statusId`, `locationId`, and text `search` (matching name). MUST support pagination via `page` and `pageSize`. Field values for `showInList` DynamicFields MUST be batch-loaded in a single query. Response MUST include `location` object when `locationId` is populated.
(Previously: No locationId filter or location data in response)

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

### Requirement: Item detail with field values

Detail endpoint MUST return the item with all its field values hydrated. Each field value MUST include the DynamicField definition for rendering. Response MUST include the full location object with path when `locationId` is populated.
(Previously: No location data in detail response)

#### Scenario: Detail returns hydrated values

- GIVEN an item with field values for `name` and `quantity`
- WHEN the detail endpoint is called
- THEN the response includes field definitions, values, and location

### Requirement: Create/edit wraps DynamicForm with value transformation

Create and edit pages MUST wrap `DynamicForm`. On submit, field values MUST transform from `{ [fieldId]: value }` to `[{ dynamicFieldId, value }]` array format. On edit load, values MUST transform from EAV array to flat object for form pre-population. `locationId` MUST be included as a top-level field separate from EAV values.
(Previously: No locationId handling in create/edit flow)

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
