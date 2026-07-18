# Delta for Configurable Statuses

## ADDED Requirements

### Requirement: Status transitions render as DropdownMenu

The item detail page MUST render available status transitions as a `DropdownMenu` component. The current status MUST be displayed as a Badge. Menu items MUST show the target status name, color indicator, and icon if present.

#### Scenario: Dropdown shows available transitions

- GIVEN an item with status "Open" and valid transitions to "In Progress" (icon: 🔄) and "On Hold"
- WHEN the detail page renders
- THEN a dropdown button shows "Open" badge, and menu lists "In Progress 🔄" and "On Hold"

#### Scenario: Empty transitions show disabled dropdown

- GIVEN an item with status "Completed" where isFinal=true
- WHEN the detail page renders
- THEN the transition dropdown is disabled with no menu items

### Requirement: Final status disables transition actions

Items in a status where `isFinal=true` MUST disable the status transition dropdown. The dropdown MUST visually indicate disabled state.

#### Scenario: Final status prevents transition UI

- GIVEN an item with status "Completed" (isFinal=true)
- WHEN a user views the detail page
- THEN the status dropdown is disabled and no transition options are clickable

### Requirement: Transition errors display as toast notifications

Status transition API errors MUST display as toast notifications. HTTP 409 (conflict) MUST show "Item status has changed. Refresh and retry." HTTP 404 (not found) MUST show "Status no longer exists." Generic errors MUST show the server message.

#### Scenario: 409 conflict toast

- GIVEN an item where another user changed the status concurrently
- WHEN the current user attempts a transition and receives 409
- THEN a toast displays "Item status has changed. Refresh and retry."

#### Scenario: 404 status not found toast

- GIVEN a status that was deactivated between page load and transition attempt
- WHEN the transition API returns 404
- THEN a toast displays "Status no longer exists."

#### Scenario: Generic error toast

- GIVEN a transition attempt
- WHEN the API returns 500 with message "Internal server error"
- THEN a toast displays "Internal server error"
