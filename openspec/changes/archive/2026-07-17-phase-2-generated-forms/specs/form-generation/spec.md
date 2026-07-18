# Form Generation Specification

## Purpose

Dynamically render validated React Hook Form forms from `DynamicFieldDefinition[]`. A Zod schema factory builds per-type validation, a field registry maps each `DynamicFieldType` to its input component, and the form returns typed, validated data on submit.

## Input Type Mapping

| DynamicFieldType | Component | Zod Base |
|---|---|---|
| SHORT_TEXT | `<Input>` | `z.string()` |
| LONG_TEXT | `<Textarea>` | `z.string()` |
| NUMBER | `<Input type="number">` | `z.number()` |
| DECIMAL | `<Input type="number" step="0.01">` | `z.number()` |
| CURRENCY | `<Input>` + unit suffix | `z.number()` |
| BOOLEAN | `<Checkbox>` | `z.boolean()` |
| DATE | DatePicker (`react-day-picker`) | `z.string()` |
| DATETIME | DateTimePicker | `z.string()` |
| SELECT | `<Select>` (dropdown) | `z.string()` |
| MULTI_SELECT | Checkbox group | `z.array(z.string())` |
| URL | `<Input type="url">` | `z.string().url()` |
| EMAIL | `<Input type="email">` | `z.string().email()` |
| PHONE | `<Input type="tel">` | `z.string()` |
| FILE, IMAGE | `<DeferredField>` | `z.any().optional()` |
| ITEM/LOCATION/USER_RELATION | `<DeferredField>` | `z.string().optional()` |

## Requirements

### Requirement: Dynamic Zod schema from field definitions

`createFieldValueSchema(fields)` MUST return a `z.ZodObject` whose shape maps each field key to a Zod type matching its `DynamicFieldType`. Per-type validation rules (min/max, minLength/maxLength, pattern) MUST be applied. Required fields MUST reject `undefined`/`null`/empty values.

#### Scenario: Schema shape matches field definitions

- GIVEN two DynamicFieldDefinitions: `name` (SHORT_TEXT, required) and `age` (NUMBER, optional)
- WHEN `createFieldValueSchema([nameDef, ageDef])` is called
- THEN the returned schema validates `{ name: "Alice", age: 30 }` and rejects `{ name: "" }` and `{ age: 30 }`

#### Scenario: Deferred types are always optional

- GIVEN a DynamicFieldDefinition with type FILE
- WHEN the schema is built
- THEN the field key is `.optional()` regardless of `required` flag

### Requirement: Required field enforcement

Required fields MUST show a visual indicator (asterisk). Zod MUST reject missing values. Optional fields MUST accept omission.

#### Scenario: Required field fails validation

- GIVEN a SHORT_TEXT field with `required: true`
- WHEN the field is left empty and submitted
- THEN Zod rejects with a required-field message

### Requirement: Field type to input mapping

A field registry MUST map all 13 active `DynamicFieldType` values to a React component. Each SHALL receive `{ field: DynamicFieldDefinition, control, errors }` and render the appropriate HTML input or component.

#### Scenario: All active types render

- GIVEN one DynamicFieldDefinition per active type (13 total)
- WHEN `<DynamicForm fields={allActiveTypes}>` renders
- THEN 13 inputs appear matching the table above

### Requirement: SELECT field rendering

SELECT fields MUST render a native or shadcn `<Select>` dropdown populated from `field.options`. Options without `value` MUST be excluded. An empty options array MUST show a placeholder.

#### Scenario: SELECT renders options

- GIVEN a SELECT definition with `options: [{label:"Active",value:"active"},{label:"Inactive",value:"inactive"}]`
- WHEN the form renders
- THEN a dropdown displays "Active" and "Inactive"

### Requirement: MULTI_SELECT field rendering

MULTI_SELECT MUST render a checkbox group with one checkbox per option. Zod MUST accept an array of selected option values.

#### Scenario: MULTI_SELECT submits selected values

- GIVEN a MULTI_SELECT with options A, B, C
- WHEN the user checks A and C and submits
- THEN the form data includes `fieldKey: ["A", "C"]`

### Requirement: Validation rules enforcement

Per-type validation rules MUST be enforced by Zod. NUMBER/DECIMAL/CURRENCY MUST respect `min`/`max`. SHORT_TEXT/LONG_TEXT MUST respect `minLength`/`maxLength`/`pattern`. DATE/DATETIME MUST respect `minDate`/`maxDate`.

#### Scenario: Number range violation

- GIVEN a NUMBER field with `validation: { min: 0, max: 100 }`
- WHEN the user submits value 150
- THEN the form shows a validation error "Must be ≤ 100"

#### Scenario: Text pattern mismatch

- GIVEN a SHORT_TEXT field with `validation: { pattern: "^[A-Z]+$" }`
- WHEN the user submits "abc123"
- THEN the form shows a pattern validation error

### Requirement: Default values

`field.defaultValue` MUST pre-populate the form input on first render. The default value schema MUST match the field type (string for TEXT types, number for NUMBER/DECIMAL/CURRENCY, boolean for BOOLEAN).

#### Scenario: Form loads with defaults

- GIVEN a SHORT_TEXT field with `defaultValue: "Draft"`
- WHEN `<DynamicForm>` mounts
- THEN the input is pre-filled with "Draft"

### Requirement: Help text display

`field.helpText` MUST render below the input when non-empty. It MUST NOT be rendered when `helpText` is `null` or empty string.

#### Scenario: Help text shown

- GIVEN a field with `helpText: "Enter serial number without dashes"`
- WHEN the form renders
- THEN the help text appears below the input

### Requirement: Deferred types as disabled placeholders

FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, and USER_RELATION MUST render a disabled component with placeholder text (e.g., "Coming soon"). The Zod schema MUST treat these as `.optional()` so the form remains submittable.

#### Scenario: Deferred field does not block submit

- GIVEN a form with one FILE field and one SHORT_TEXT field
- WHEN the user fills the SHORT_TEXT field and submits
- THEN the form submits successfully without requiring the FILE field

### Requirement: Form submission yields typed data

`onSubmit(values)` MUST receive a validated, typed object where each key matches a field key and each value matches the field type. Invalid submissions MUST NOT call `onSubmit`.

#### Scenario: Valid submission

- GIVEN fields `sku` (SHORT_TEXT, required) and `quantity` (NUMBER, required)
- WHEN the user enters `"ABC"` and `5` and submits
- THEN `onSubmit` receives `{ sku: "ABC", quantity: 5 }` with correct TypeScript types

#### Scenario: Invalid submission blocked

- GIVEN fields `email` (EMAIL, required)
- WHEN the user enters `"not-an-email"` and submits
- THEN `onSubmit` is NOT called and the email field shows a validation error
