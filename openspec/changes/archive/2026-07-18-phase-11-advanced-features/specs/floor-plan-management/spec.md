# Delta for Floor Plan Management

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: LocationMarker model with normalized coordinates

Markers MUST have either `x` and `y` coordinates (for `POINT` type) or a `points` array of `{x, y}` vertices (for `POLYGON` type). All coordinates MUST be normalized to 0–1 range. Each marker MUST reference a Location. Multiple markers MAY exist on one FloorPlan. Coordinates MUST validate within 0–1 inclusive.

(Previously: Marker model only supported POINT type with single x/y coordinates)

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
