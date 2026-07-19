# Floor Plan Management Specification

## Purpose

Floor plan image upload and location marker management. Reuses StorageDriver from Phase 5. Normalized coordinates (0–1) for marker portability across resolutions. Supports polymorphic marker types (POINT and POLYGON) with layer categorization.

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

Markers MUST have either `x` and `y` coordinates (for `POINT` type) or a `points` array of `{x, y}` vertices (for `POLYGON` type). All coordinates MUST be normalized to 0–1 range. Each marker MUST reference a Location. Multiple markers MAY exist on one FloorPlan. Coordinates MUST validate within 0–1 inclusive.

#### Scenario: Create point marker at coordinates

- GIVEN a floor plan with a location
- WHEN a `POINT` marker is created at `{ x: 0.5, y: 0.3 }`
- THEN the marker persists with normalized coordinates

#### Scenario: Create polygon marker with vertices

- GIVEN a floor plan with a location
- WHEN a `POLYGON` marker is created with `points: [{x:0.2,y:0.2}, {x:0.5,y:0.2}, {x:0.5,y:0.5}]`
- THEN the marker persists with normalized vertex coordinates

#### Scenario: Reject out-of-range coordinates

- GIVEN a floor plan
- WHEN a `POINT` marker is created at `{ x: 1.5, y: -0.1 }`
- THEN the API returns `400` with coordinate range error

#### Scenario: Reject polygon with fewer than 3 vertices

- GIVEN a floor plan
- WHEN a `POLYGON` marker is created with `points: [{x:0.1,y:0.1}, {x:0.2,y:0.2}]`
- THEN the API returns `400` with "Polygon requires at least 3 vertices"

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

### Requirement: LocationMarker polymorphic type and layer support

The `LocationMarker` model MUST support a `type` discriminator (`POINT` default | `POLYGON`) and a `layer` category field. New columns added: `type`, `points` (Json?), `layer` (String?), `fillColor` (String?), `strokeColor` (String?), `strokeWidth` (Float? default 2).

The system MUST validate that `points` is non-empty and contains at least 3 vertices when `type=POLYGON`.

#### Scenario: Create polygon marker with layer

- GIVEN a floor plan
- WHEN a marker is created with `type="POLYGON"`, `points=[{x:0.2,y:0.2},{x:0.5,y:0.2},{x:0.5,y:0.5}]`, `layer="safety"`, `fillColor="#ff000040"`
- THEN the marker persists with all polygon fields and normalized vertices

#### Scenario: Existing markers default to POINT type

- GIVEN the `type` field is added to an existing schema with markers
- WHEN the migration runs
- THEN all existing markers have `type="POINT"` and null `points`

### Requirement: Validation and error handling

Input MUST be validated with shared Zod schemas. Marker `label` MUST be 1–100 chars. Prisma errors MUST map to safe envelopes never exposing DB internals.

#### Scenario: Empty marker label rejected

- GIVEN a project owner creating a marker
- WHEN `label` is empty string
- THEN the API returns `400` with validation message

### Requirement: Floor plan image serving endpoint

The system MUST provide `GET /api/projects/{projectId}/floor-plans/{floorPlanId}/image` that reads the floor plan file from StorageDriver and streams it with appropriate `Content-Type`. The endpoint SHALL require project membership; non-members SHALL receive 404. The response SHALL include `Content-Length` header.

(Reference: follows same pattern as `GET /api/.../documents/[documentId]/download`)

#### Scenario: Serve PNG floor plan image

- GIVEN a project member requesting a PNG floor plan image
- WHEN the API endpoint is called
- THEN the response has `Content-Type: image/png`
- AND the binary image data is streamed from StorageDriver

#### Scenario: Serve SVG floor plan image

- GIVEN a project member requesting an SVG floor plan image
- WHEN the API endpoint is called
- THEN the response has `Content-Type: image/svg+xml`

#### Scenario: Unauthorized image access

- GIVEN a non-member requesting a floor plan image
- WHEN the API endpoint is called
- THEN the response is 404

#### Scenario: Missing file on disk

- GIVEN a floor plan record exists but its storage file is missing
- WHEN the API endpoint is called
- THEN the response is 404 with "Image file not found"

### Requirement: Floor plan list page image rendering

Floor plan list page images SHALL load via the API image serving endpoint (`/api/projects/{projectId}/floor-plans/{floorPlanId}/image`), not via direct `imageUrl` storage path. The `<img>` tag's `src` attribute SHALL use the API endpoint URL.

(Previously: `<img src={plan.imageUrl}>` used raw StorageDriver path that browsers cannot resolve)

#### Scenario: List page thumbnail renders

- GIVEN a floor plans list page
- WHEN the page loads
- THEN each plan card displays its image loaded from the API endpoint

### Requirement: Floor plan list "View" link

The "View" link on the floor plan list page SHALL use Next.js `<Link>` component with `href` pointing to the view page route `/projects/{projectCode}/floor-plans/{planId}`. (Previously used `<a href={...}>` causing full-page reloads and 404 since no `[floorPlanId]/page.tsx` existed.)

#### Scenario: View link navigates client-side

- GIVEN a floor plan list with a "View" link
- WHEN the user clicks "View"
- THEN navigation is client-side (no full-page reload)
- AND the floor plan view page renders with interactive viewer
