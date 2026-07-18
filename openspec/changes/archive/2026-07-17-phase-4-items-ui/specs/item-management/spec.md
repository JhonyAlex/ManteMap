# Delta for Item Management

## ADDED Requirements

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

Create and edit pages MUST wrap `DynamicForm`. On submit, field values MUST transform from `{ [fieldId]: value }` to `[{ dynamicFieldId, value }]` array format. On edit load, values MUST transform from EAV array to flat object for form pre-population.

#### Scenario: Submit transforms to EAV format

- GIVEN form values `{ "field-1": "Widget", "field-2": 42 }`
- WHEN the form submits
- THEN the API receives `[{ dynamicFieldId: "field-1", value: "Widget" }, { dynamicFieldId: "field-2", value: 42 }]`

#### Scenario: Edit pre-populates from EAV

- GIVEN an item with field values `[{ dynamicFieldId: "field-1", value: "Widget" }]`
- WHEN the edit page loads
- THEN the form field "field-1" shows "Widget"
