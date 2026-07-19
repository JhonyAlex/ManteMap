# Floor Plan Viewer Specification

## Purpose

Interactive React Konva canvas viewer for floor plans with zoom/pan, draggable markers, click-to-open item cards, polygon rendering, and location type/status/category layer filters. Dynamic import (~100KB) with SSR disabled.

## Requirements

### Requirement: Canvas rendering with dynamic import

FloorPlanViewer MUST use React Konva with `dynamic(() => import(...), { ssr: false })`. The component SHALL NOT load during SSR. Canvas MUST render the floor plan image as background layer.

#### Scenario: Lazy load on page visit

- GIVEN a floor plan page
- WHEN the user navigates to it
- THEN the Konva canvas loads dynamically without SSR errors

### Requirement: Zoom and pan controls

Canvas MUST support mouse wheel zoom (min 0.5x, max 5x) and click-drag panning. A reset button SHALL restore default view. Touch gestures (pinch-zoom, drag) MUST work on touch devices.

#### Scenario: Mouse wheel zoom

- GIVEN a floor plan viewer at default zoom
- WHEN the user scrolls the mouse wheel up
- THEN the canvas zooms in centered on cursor position

#### Scenario: Reset view

- GIVEN a zoomed/panned floor plan
- WHEN the user clicks the reset button
- THEN the canvas returns to fit-to-container default

### Requirement: Marker rendering and interaction

Markers MUST render as positioned icons on the canvas at normalized coordinates. Each marker SHALL show its label on hover. Clicking a marker MUST open a popover/card with the associated location's items.

#### Scenario: Marker click opens item card

- GIVEN a floor plan with a marker for "Room 101"
- WHEN the user clicks the marker
- THEN a card displays items assigned to "Room 101"

#### Scenario: Marker positioned correctly

- GIVEN a marker at `{ x: 0.5, y: 0.3 }` on an 800×600 canvas
- WHEN the viewer renders
- THEN the marker appears at pixel position (400, 180)

### Requirement: Draggable marker repositioning

Project owners MUST be able to drag markers to reposition them. On drop, the new normalized coordinates SHALL persist via API update. Non-owners MUST NOT be able to drag markers.

#### Scenario: Owner drags marker

- GIVEN a project owner viewing a floor plan
- WHEN they drag a marker from (0.5, 0.3) to (0.7, 0.6)
- THEN the marker's coordinates update to `{ x: 0.7, y: 0.6 }`

### Requirement: Type, status, and category layer filters

A filter toolbar MUST allow toggling marker visibility by location type (POINT, POLYGON), by category layer (from marker `layer` field), and by item status. Filters SHALL use AND logic across categories, OR within a category. Layer filters MUST apply to both POINT and POLYGON marker types.

The `FilterState` MUST include a `categories: Record<string, boolean>` field. The viewer toolbar SHALL display category toggle buttons. Toggling a category off MUST hide all markers (both POINT and POLYGON) assigned to that layer. Markers with no `layer` assigned SHALL appear under an "Uncategorized" toggle (on by default).

#### Scenario: Filter by location type

- GIVEN floor plan with POINT and POLYGON markers
- WHEN the user deselects "POLYGON" in the type filter
- THEN only POINT markers remain visible

#### Scenario: Filter by category layer

- GIVEN floor plan with markers in "safety" and "equipment" layers
- WHEN the user deselects "safety" in the layer filter
- THEN only equipment markers remain visible

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

### Requirement: Responsive container

Canvas MUST resize to fill its parent container. On window resize, the canvas SHALL re-render at the new dimensions. Markers MUST maintain correct relative positions after resize.

#### Scenario: Window resize

- GIVEN a floor plan viewer at 800×600
- WHEN the window resizes to 1200×900
- THEN the canvas resizes and markers remain at correct relative positions

### Requirement: Image source from API endpoint

FloorPlanViewer's `imageUrl` prop SHALL be an API endpoint URL (`/api/projects/{projectId}/floor-plans/{floorPlanId}/image`) served by the floor plan image endpoint. The browser SHALL load the image via authenticated HTTP request. (Previously the prop held a StorageDriver path that was not publicly accessible.)

#### Scenario: Image loads via API

- GIVEN a FloorPlanViewer receiving an API endpoint URL as `imageUrl`
- WHEN the Konva canvas initializes the background `Image` object
- THEN the image loads successfully from the authenticated API endpoint
- AND the browser sends session cookies with the request

#### Scenario: Missing or invalid image

- GIVEN a FloorPlanViewer with an `imageUrl` pointing to a non-existent floor plan
- WHEN the image fails to load
- THEN the canvas shows an error placeholder (no crash)
