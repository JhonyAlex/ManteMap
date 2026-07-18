# Items UI Specification

## Purpose

Frontend CRUD for items — list with dynamic columns, detail view, create/edit forms, and status transitions. Covers pages, components, hooks, and QueryClient wiring.

## Requirements

### Requirement: QueryClient infrastructure

The application MUST configure a `QueryClientProvider` wrapping the dashboard layout. Default options MUST set `staleTime` to 30 seconds and `refetchOnWindowFocus` to false.

#### Scenario: QueryClient available to child components

- GIVEN the dashboard layout renders
- WHEN a child component calls `useQuery`
- THEN the query executes without errors

### Requirement: Items list page with dynamic columns

The items list page MUST derive table columns from `showInList` DynamicFields of the selected ItemType. Columns MUST render field values by type (text, number, date, boolean, status). The list MUST support pagination and text search.

#### Scenario: Dynamic columns from ItemType fields

- GIVEN an ItemType "Pump" with fields: name (showInList), serialNumber (showInList), notes (hidden)
- WHEN the items list page loads for "Pump"
- THEN the table shows "Name" and "Serial Number" columns only

#### Scenario: Pagination controls

- GIVEN 50 items exist for an ItemType with pageSize 20
- WHEN the list page loads
- THEN 20 items display with page navigation controls

### Requirement: Item detail page

The detail page MUST render all field values by type using the field registry. It MUST display the current status as a Badge with the status color. It MUST provide edit and delete actions.

#### Scenario: Field values rendered by type

- GIVEN an item with SHORT_TEXT, NUMBER, and BOOLEAN fields
- WHEN the detail page loads
- THEN each field renders via its type-specific component

#### Scenario: Status badge displayed

- GIVEN an item with status "Active" (color #22c55e)
- WHEN the detail page loads
- THEN a green badge labeled "Active" displays

### Requirement: Create and edit item forms

Create and edit pages MUST wrap the existing `DynamicForm` component. Form submission MUST transform field values to the API's `{ dynamicFieldId, value }` format. Edit page MUST pre-populate with existing field values.

#### Scenario: Create item via DynamicForm

- GIVEN an ItemType with fields name and quantity
- WHEN a user fills the form and submits
- THEN a POST request sends field values in EAV format

#### Scenario: Edit pre-populates existing values

- GIVEN an item with name="Widget" and quantity=42
- WHEN the edit page loads
- THEN the form fields show "Widget" and 42

### Requirement: Status transition UI

The detail page MUST render a DropdownMenu listing available status transitions. Selecting a status MUST call the transition API. Final statuses MUST disable the transition dropdown. Transition errors (409, 404) MUST display as toast notifications.

#### Scenario: Transition dropdown shows available statuses

- GIVEN an item with status "Open" and available transitions to "In Progress" and "On Hold"
- WHEN the detail page loads
- THEN a dropdown shows "In Progress" and "On Hold" options

#### Scenario: Final status disables transitions

- GIVEN an item with status "Completed" where isFinal=true
- WHEN the detail page loads
- THEN the status transition dropdown is disabled

#### Scenario: Transition error shows toast

- GIVEN an item in a final status
- WHEN a transition is attempted
- THEN a toast notification displays the error message

### Requirement: Sidebar navigation entry

The project sidebar MUST include an "Items" navigation link. The link MUST route to `/projects/{projectId}/items`.

#### Scenario: Items link in sidebar

- GIVEN a user viewing a project dashboard
- WHEN the sidebar renders
- THEN an "Items" link is visible and navigates to the items list

### Requirement: Delete confirmation

Delete actions MUST present a confirmation dialog before executing. Confirmation MUST call the DELETE API and redirect to the list page.

#### Scenario: Delete with confirmation

- GIVEN a user on the item detail page
- WHEN they click delete and confirm
- THEN the item is deleted and the user is redirected to the items list
