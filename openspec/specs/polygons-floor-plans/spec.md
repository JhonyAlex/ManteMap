# Polygons on Floor Plans Specification

## Purpose

Extend the LocationMarker model with a polymorphic POINT|POLYGON type and provide polygon drawing/editing interaction on Konva floor plan canvases with fill and stroke styling.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| POLY-001 | Polymorphic LocationMarker type (POINT | POLYGON) | MUST |
| POLY-002 | Polygon vertex drawing via click-to-place | MUST |
| POLY-003 | Vertex dragging for polygon editing | MUST |
| POLY-004 | Polygon fill and stroke styling | MUST |
| POLY-005 | Polygon validation (minimum 3 vertices) | MUST |
| POLY-006 | Normalized coordinate storage | MUST |

### Requirement: Polymorphic marker type (POLY-001)

The `LocationMarker` model MUST support a `type` field with values `POINT` (default) and `POLYGON`. For `POINT`, `x` and `y` fields store position. For `POLYGON`, `points` JSON field MUST store vertex array `[{x: number, y: number}, ...]`. Existing markers MUST remain as `POINT` type.

#### Scenario: Create polygon marker with vertices
- GIVEN a floor plan in edit mode
- WHEN a polygon is created with vertices `[{x:0.2,y:0.2}, {x:0.5,y:0.2}, {x:0.5,y:0.5}, {x:0.2,y:0.5}]`
- THEN the marker persists with `type="POLYGON"` and `points` containing the 4 vertices

#### Scenario: Existing markers unaffected
- GIVEN 10 existing `POINT` markers on a floor plan
- WHEN the `type` field is added to the schema
- THEN all existing markers default to `type="POINT"` with no data loss

### Requirement: Polygon vertex drawing (POLY-002)

In polygon drawing mode, clicking on the canvas MUST place a vertex at the normalized coordinate. A ghost line SHALL preview the segment from the last vertex to cursor. Double-clicking or pressing ESC MUST close the polygon. The drawing mode SHALL be cancelable via a toolbar button.

#### Scenario: Draw polygon by clicking vertices
- GIVEN polygon drawing mode is active
- WHEN the user clicks three points on the canvas: (100,100), (300,100), (300,300)
- THEN three vertices appear with connecting lines; double-click closes the polygon

#### Scenario: Cancel drawing mid-polygon
- GIVEN the user has placed 2 vertices
- WHEN the user presses ESC or clicks cancel
- THEN the incomplete polygon is discarded and drawing mode exits

### Requirement: Vertex dragging (POLY-003)

Existing polygons MUST support vertex dragging. When a vertex is dragged, the polygon shape SHALL update in real-time. On drag end, the updated `points` array MUST persist via the marker update API.

#### Scenario: Drag vertex to reshape polygon
- GIVEN a polygon with vertices at normalized coords
- WHEN the user drags the top-right vertex from (0.5, 0.2) to (0.6, 0.15)
- THEN the polygon reshapes and the updated `points` array is saved

### Requirement: Fill and stroke styling (POLY-004)

Polygon markers MUST support `fillColor` (hex with alpha optional, e.g., `#ff000080`), `strokeColor`, and `strokeWidth`. These MUST render on the Konva canvas via `Line` with `closed={true}` and `fill={fillColor}`.

#### Scenario: Polygon renders with fill and stroke
- GIVEN a polygon with `fillColor="#00ff0040"`, `strokeColor="#00ff00"`, `strokeWidth=3`
- WHEN the floor plan viewer renders
- THEN the polygon appears with semi-transparent green fill and bright green outline

### Requirement: Polygon validation (POLY-005)

Polygons MUST have at least 3 vertices. Creation with fewer than 3 vertices MUST be rejected. Self-intersecting polygons SHOULD be flagged with a warning but not blocked.

#### Scenario: Two-vertex polygon rejected
- GIVEN polygon drawing mode
- WHEN the user places only 2 vertices and attempts to close
- THEN the API returns `400` with "Polygon requires at least 3 vertices"

### Requirement: Normalized coordinates (POLY-006)

Polygon vertex coordinates MUST be stored normalized (0–1 range), consistent with existing marker coordinate normalization. Rendering MUST convert normalized coordinates to pixel coordinates based on current canvas dimensions.

#### Scenario: Polygon scales correctly on resize
- GIVEN a polygon with vertices normalized to 0–1
- WHEN the canvas resizes from 800×600 to 1200×900
- THEN the polygon vertices scale proportionally to maintain correct relative position
