# Location Assignment Specification

## Purpose

LocationPicker component for assigning items to locations via `locationId` FK. Activates LOCATION_RELATION field type. Integrates with item create/edit forms.

## Requirements

### Requirement: LocationPicker component

LocationPicker MUST render a searchable tree-select dropdown showing the full location hierarchy. Selected location SHALL display its full path (e.g., "Center > Building > Floor"). Component MUST support both single selection and clear action.

#### Scenario: Select location from tree

- GIVEN a LocationPicker in an item form
- WHEN the user opens the dropdown and selects "Room 101"
- THEN the input shows "Center > Building > Floor > Room 101"

#### Scenario: Clear selection

- GIVEN a LocationPicker with "Room 101" selected
- WHEN the user clicks the clear button
- THEN the selection becomes null

### Requirement: locationId FK on Item model

Item model MUST have an optional `locationId` foreign key referencing Location. Nullable — items MAY exist without a location. Cascade behavior: deleting a location MUST set `locationId` to null on affected items (SET NULL).

#### Scenario: Create item with location

- GIVEN a project with location "Room 101"
- WHEN an item is created with `locationId: "room-101-id"`
- THEN the item persists with the location reference

#### Scenario: Location deletion nullifies items

- GIVEN 3 items assigned to "Room 101"
- WHEN "Room 101" is deleted
- THEN all 3 items have `locationId: null`

### Requirement: Location in list/detail queries

Item list endpoint MUST include `location` in the response when populated. Detail endpoint MUST include the full location object with path. List MAY support filtering by `locationId`.

#### Scenario: Item list includes location

- GIVEN items with and without locations
- WHEN the list endpoint is called
- THEN each item's response includes `location: { id, name, path }` or `location: null`

#### Scenario: Filter by location

- GIVEN items across multiple locations
- WHEN listing with `?locationId=room-101-id`
- THEN only items assigned to that location return

### Requirement: LOCATION_RELATION field type activation

LOCATION_RELATION MUST be a fully functional field type in the field registry. It SHALL render the LocationPicker component. Zod validation MUST accept a valid location ID string or null. The deferred placeholder MUST be removed.

#### Scenario: LOCATION_RELATION field renders LocationPicker

- GIVEN an ItemType with a LOCATION_RELATION dynamic field
- WHEN the item create form renders
- THEN a LocationPicker component appears (not a disabled placeholder)

#### Scenario: Validation accepts location ID

- GIVEN a LOCATION_RELATION field with `required: true`
- WHEN a valid location ID is submitted
- THEN Zod validation passes
