# Delta for Floor Plan Management

## ADDED Requirements

### Requirement: Project ownership chain invariants

Every floor-plan operation MUST resolve the requested project and prove the complete ownership chain before reading storage or mutating data: `Location.projectId`, `FloorPlan.locationId`, `LocationMarker.floorPlanId`, and `Item.itemType.projectId`. A caller MUST NOT use membership in one project to access a resource from another project. Safe not-found responses MUST hide cross-project resource existence.

#### Scenario: Reject cross-project floor-plan access

- GIVEN a member of project A and a floor plan whose location belongs to project B
- WHEN the caller reads the plan, reads its image, or deletes it through project A
- THEN the request returns safe not-found
- AND storage read/delete and database mutation are not called

#### Scenario: Reject foreign location upload and listing

- GIVEN a location in project B and an owner of project A
- WHEN the caller uploads or lists floor plans for that location through project A
- THEN the request returns safe not-found
- AND no file or FloorPlan record is created

#### Scenario: Marker belongs to requested plan

- GIVEN a marker belongs to plan B
- WHEN a caller reads, updates, or deletes it through plan A
- THEN the request returns safe not-found
- AND the marker remains unchanged

#### Scenario: Reject marker operation through foreign plan

- GIVEN a plan belongs to project B
- WHEN a member or owner of project A lists, creates, updates, or deletes markers through that plan ID
- THEN the request returns safe not-found
- AND no marker mutation occurs

## MODIFIED Requirements

### Requirement: LocationMarker model with normalized coordinates

Markers MUST belong to exactly one FloorPlan. They MUST have either `x` and `y` coordinates (for `POINT`) or a `points` array of `{x, y}` vertices (for `POLYGON`). Coordinates MUST be normalized to 0–1 inclusive. Multiple markers MAY exist on one FloorPlan. When `itemId` is present, the Item MUST belong to the same project and MUST NOT be associated more than once with that FloorPlan. Creation and reassignment MUST validate these rules before mutation; label-only markers MAY remain unassociated.

(Previously: markers were described as referencing Location directly and had no cross-project or duplicate item-association invariant.)

#### Scenario: Create point marker at coordinates

- GIVEN a floor plan with a location
- WHEN a `POINT` marker is created at `{ x: 0.5, y: 0.3 }`
- THEN the marker persists with normalized coordinates

#### Scenario: Create polygon marker with vertices

- GIVEN a floor plan with a location
- WHEN a `POLYGON` marker is created with at least three normalized vertices
- THEN the marker persists with normalized vertex coordinates

#### Scenario: Reject out-of-range coordinates

- GIVEN a floor plan
- WHEN a point or polygon coordinate falls outside 0–1
- THEN the API returns `400` with a coordinate range error

#### Scenario: Reject polygon with fewer than 3 vertices

- GIVEN a floor plan
- WHEN a polygon contains fewer than three vertices
- THEN the API returns `400` with the polygon validation error

#### Scenario: Reject cross-project item association

- GIVEN a floor plan in project A and an item whose ItemType belongs to project B
- WHEN an owner creates or updates a marker with that item ID
- THEN the request returns safe not-found and writes no association

#### Scenario: Reject duplicate association

- GIVEN an item is already associated with one marker on a floor plan
- WHEN another marker is created or reassigned to that item on the same plan
- THEN the request returns a safe conflict and preserves the original association

#### Scenario: Preserve association when item is omitted

- GIVEN an existing associated marker
- WHEN only coordinates or presentation fields are updated
- THEN the item association remains unchanged
