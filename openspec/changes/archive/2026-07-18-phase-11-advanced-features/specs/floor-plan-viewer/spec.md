# Delta for Floor Plan Viewer

## ADDED Requirements

### Requirement: Polygon layer rendering

The viewer MUST render polygon markers via a `PolygonLayer` component (alongside existing `MarkerLayer`). Polygons SHALL render as Konva `Line` elements with `closed={true}`, `fill={fillColor}`, `stroke={strokeColor}`, and `strokeWidth`. Polygon vertices MUST be converted from normalized to pixel coordinates.

#### Scenario: Polygon renders on floor plan
- GIVEN a `POLYGON` marker with fillColor and strokeColor on a floor plan
- WHEN the viewer loads
- THEN the polygon appears as a filled, outlined shape at the correct canvas position

#### Scenario: Point and polygon markers coexist
- GIVEN a floor plan with 3 POINT markers and 2 POLYGON markers
- WHEN the viewer renders
- THEN all 5 markers/types appear in correct positions; POINT markers render as icons, POLYGON markers as filled shapes

### Requirement: Layer (category) filter toggles

The `FilterState` MUST include a `categories: Record<string, boolean>` field. The viewer toolbar SHALL display category toggle buttons. Toggling a category off MUST hide all markers (both POINT and POLYGON) assigned to that layer. Markers with no `layer` assigned SHALL appear under an "Uncategorized" toggle (on by default).

#### Scenario: Toggle safety layer off
- GIVEN markers in layers "safety" (3 markers), "equipment" (5 markers), and uncategorized (2 markers)
- WHEN the user deselects "safety" in the layer toggle toolbar
- THEN the 3 safety markers are hidden; equipment and uncategorized markers remain visible

#### Scenario: All layers off shows empty canvas
- GIVEN all layer toggles deselected
- WHEN the user deselects every category
- THEN no markers are visible on the canvas

#### Scenario: Combined search and layer filtering
- GIVEN safety-layer markers "Fire Extinguisher A" and "Fire Extinguisher B" plus equipment marker "Pump C"
- WHEN search="Fire" AND equipment layer is toggled off
- THEN only "Fire Extinguisher A" and "Fire Extinguisher B" are visible

## MODIFIED Requirements

### Requirement: Type and status layer filters

A filter toolbar MUST allow toggling marker visibility by location type (POINT, POLYGON), by category layer (from marker `layer` field), and by item status. Filters SHALL use AND logic across categories, OR within a category. Layer filters MUST apply to both POINT and POLYGON marker types.

(Previously: Filtering was only by location type (Center/Building/Floor/Room/Zone) and item status — no polygon or layer category support)

#### Scenario: Filter by location type
- GIVEN floor plan with POINT and POLYGON markers
- WHEN the user deselects "POLYGON" in the type filter
- THEN only POINT markers remain visible

#### Scenario: Filter by category layer
- GIVEN floor plan with markers in "safety" and "equipment" layers
- WHEN the user deselects "safety" in the layer filter
- THEN only equipment markers remain visible
