# Delta for Dynamic Field Management

## MODIFIED Requirements

### Requirement: 18 supported field types

MUST support: SHORT_TEXT, LONG_TEXT, NUMBER, DECIMAL, CURRENCY, BOOLEAN, DATE, DATETIME, SELECT, MULTI_SELECT, URL, EMAIL, PHONE, FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION. LOCATION_RELATION MUST be fully functional (not deferred). Type stored as DB enum, validated at creation. Unknown types MUST return `400`.
(Previously: LOCATION_RELATION was listed but treated as deferred/unimplemented)

#### Scenario: Reject unknown field type

- GIVEN a project owner creating a field
- WHEN input includes `type: "CUSTOM_TYPE"`
- THEN the API returns `400`

#### Scenario: LOCATION_RELATION creates successfully

- GIVEN a project owner creating a field
- WHEN input includes `type: "LOCATION_RELATION"`
- THEN the field persists and renders as LocationPicker in forms
