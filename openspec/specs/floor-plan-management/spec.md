# Floor Plan Management Specification

## Purpose

Floor plan image upload and location marker management. Reuses StorageDriver from Phase 5. Normalized coordinates (0–1) for marker portability across resolutions.

## Requirements

### Requirement: FloorPlan model with image upload

FloorPlans MUST belong to exactly one Location. Image upload SHALL reuse the existing StorageDriver pipeline (local/S3). Supported formats: PNG, JPG, SVG. Max file size MUST be enforced (default 10MB).

#### Scenario: Upload floor plan

- GIVEN a project owner with a valid location
- WHEN uploading a PNG floor plan image
- THEN the image persists via StorageDriver and a FloorPlan record is created

#### Scenario: Reject unsupported format

- GIVEN a project owner uploading a file
- WHEN the file is a `.pdf` or `.exe`
- THEN the API returns `400` with format error

#### Scenario: Reject oversized file

- GIVEN a project owner uploading a file
- WHEN the file exceeds the max size limit
- THEN the API returns `413` with size error

### Requirement: LocationMarker model with normalized coordinates

Markers MUST have `x` and `y` coordinates normalized to 0–1 range. Each marker MUST reference a Location. Multiple markers MAY exist on one FloorPlan. Coordinates MUST validate within 0–1 inclusive.

#### Scenario: Create marker at coordinates

- GIVEN a floor plan with a location
- WHEN a marker is created at `{ x: 0.5, y: 0.3 }`
- THEN the marker persists with normalized coordinates

#### Scenario: Reject out-of-range coordinates

- GIVEN a floor plan
- WHEN a marker is created at `{ x: 1.5, y: -0.1 }`
- THEN the API returns `400` with coordinate range error

### Requirement: Marker CRUD scoped to floor plan

All marker operations MUST be scoped through `/api/projects/{projectId}/floor-plans/{floorPlanId}/markers/`. Cascade deletion from FloorPlan MUST remove all markers.

#### Scenario: Cascade delete markers

- GIVEN a floor plan with 5 markers
- WHEN the floor plan is deleted
- THEN the floor plan and all 5 markers are removed

### Requirement: Floor plan CRUD access

Caller MUST be a project member. Non-members MUST receive `404`. Non-owner members MUST receive `403` on mutations.

#### Scenario: Non-owner mutation denied

- GIVEN a non-owner project member
- WHEN they attempt to upload a floor plan
- THEN the API returns `403`

### Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Marker `label` MUST be 1–100 chars. Prisma errors MUST map to safe envelopes never exposing DB internals.

#### Scenario: Empty marker label rejected

- GIVEN a project owner creating a marker
- WHEN `label` is empty string
- THEN the API returns `400` with validation message
