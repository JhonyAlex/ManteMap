# Location Hierarchy Specification

## Purpose

Hierarchical location model for organizing assets by physical space (Center → Building → Floor → Room → Zone). Adjacency-list pattern with max 5 levels, project-scoped access, tree API.

## Requirements

### Requirement: Location model with adjacency-list hierarchy

Each Location MUST have an optional `parentId` self-referential FK. Root locations have `parentId: null`. Maximum depth SHALL be 5 levels enforced at service level. Cycle detection MUST reject updates that create circular references.

#### Scenario: Create root location

- GIVEN a project owner
- WHEN creating a location with `parentId: null`
- THEN the location persists as a root with depth level 0

#### Scenario: Depth limit enforcement

- GIVEN a location tree at depth 4 (5 levels total)
- WHEN a child is created under the deepest node
- THEN the API returns `400` with depth limit message

#### Scenario: Cycle rejection

- GIVEN location A is parent of B, B is parent of C
- WHEN C is updated to set `parentId: A`
- THEN the API returns `400` with cycle detection message

### Requirement: Project-scoped CRUD access

All operations MUST be scoped through `/api/projects/{projectId}/locations/`. Caller MUST be a project member. Non-members MUST receive `404`. Non-owner members MUST receive `403` on mutations.

#### Scenario: Non-member denied

- GIVEN a location in project A
- WHEN a non-member requests the location tree
- THEN the API returns `404`

### Requirement: Tree endpoint

A tree endpoint MUST return the full location hierarchy as a nested JSON structure. Each node SHALL include `id`, `name`, `type`, `depth`, and `children[]`. Tree MUST be ordered by `order` field at each level.

#### Scenario: Full tree retrieval

- GIVEN a project with locations: Center (root) → Building → Floor
- WHEN the tree endpoint is called
- THEN the response is `{ id, name, children: [{ id, name, children: [...] }] }`

### Requirement: Location ordering

Locations MUST have an integer `order` column for sibling ordering. Reorder endpoint MUST accept ordered location ID array and update atomically. Locations MUST return ascending by default.

#### Scenario: Reorder siblings

- GIVEN locations A, B, C at 0, 1, 2 under same parent
- WHEN `PUT .../locations/reorder` receives `{ "locationIds": ["C", "A", "B"] }`
- THEN C→0, A→1, B→2

### Requirement: Cascade deletion

Deleting a location MUST cascade to all descendants. MUST return `204`. MUST NOT allow deletion of locations with assigned items without explicit confirmation flag.

#### Scenario: Cascade delete

- GIVEN a parent with 3 child locations
- WHEN the parent is deleted
- THEN parent and all children are removed

### Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Location `name` MUST be 1–200 chars. `type` MUST be a valid enum value. Prisma errors MUST map to safe envelopes.

#### Scenario: Invalid name rejected

- GIVEN a project owner creating a location
- WHEN `name` is empty string
- THEN the API returns `400` with validation message
