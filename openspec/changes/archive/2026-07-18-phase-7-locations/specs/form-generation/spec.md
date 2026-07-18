# Delta for Form Generation

## MODIFIED Requirements

### Requirement: Deferred types as disabled placeholders

FILE, IMAGE, ITEM_RELATION, and USER_RELATION MUST render a disabled component with placeholder text (e.g., "Coming soon"). LOCATION_RELATION MUST render the LocationPicker component (no longer deferred). The Zod schema MUST treat FILE/IMAGE as `.optional()` so the form remains submittable. LOCATION_RELATION MUST validate as a string location ID or null.
(Previously: LOCATION_RELATION was grouped with other deferred types as disabled placeholder)

#### Scenario: Deferred field does not block submit

- GIVEN a form with one FILE field and one SHORT_TEXT field
- WHEN the user fills the SHORT_TEXT field and submits
- THEN the form submits successfully without requiring the FILE field

#### Scenario: LOCATION_RELATION renders LocationPicker

- GIVEN a form with a LOCATION_RELATION field
- WHEN the form renders
- THEN a searchable LocationPicker component appears (not a disabled placeholder)

### Requirement: Field type to input mapping

A field registry MUST map all 18 `DynamicFieldType` values to a React component. LOCATION_RELATION SHALL map to LocationPicker. Each SHALL receive `{ field: DynamicFieldDefinition, control, errors }` and render the appropriate HTML input or component.
(Previously: 13 active types, LOCATION_RELATION mapped to DeferredField)

#### Scenario: All active types render

- GIVEN one DynamicFieldDefinition per active type (18 total including LOCATION_RELATION)
- WHEN `<DynamicForm fields={allActiveTypes}>` renders
- THEN 18 inputs appear matching the table above

### Requirement: Dynamic Zod schema from field definitions

`createFieldValueSchema(fields)` MUST return a `z.ZodObject` whose shape maps each field key to a Zod type matching its `DynamicFieldType`. LOCATION_RELATION SHALL validate as `z.string().uuid().optional()` (or required per field config). Per-type validation rules MUST be applied. Required fields MUST reject `undefined`/`null`/empty values.
(Previously: LOCATION_RELATION validated as `z.string().optional()` — always optional, no UUID)

#### Scenario: Schema shape matches field definitions

- GIVEN two DynamicFieldDefinitions: `name` (SHORT_TEXT, required) and `location` (LOCATION_RELATION, optional)
- WHEN `createFieldValueSchema([nameDef, locationDef])` is called
- THEN the returned schema validates `{ name: "Alice", location: "uuid-here" }` and rejects `{ name: "" }`
