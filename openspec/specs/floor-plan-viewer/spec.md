# Floor Plan Viewer Specification

## Purpose

Interactive React Konva canvas viewer for floor plans with zoom/pan, draggable markers, click-to-open item cards, and type/status layer filters. Dynamic import (~100KB) with SSR disabled.

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

### Requirement: Type and status layer filters

A filter toolbar MUST allow toggling marker visibility by location type (Center, Building, Floor, Room, Zone) and by item status. Filters SHALL use AND logic across categories, OR within a category.

#### Scenario: Filter by location type

- GIVEN floor plan with markers for Room and Zone types
- WHEN the user deselects "Zone" in the type filter
- THEN only Room markers remain visible

### Requirement: Responsive container

Canvas MUST resize to fill its parent container. On window resize, the canvas SHALL re-render at the new dimensions. Markers MUST maintain correct relative positions after resize.

#### Scenario: Window resize

- GIVEN a floor plan viewer at 800×600
- WHEN the window resizes to 1200×900
- THEN the canvas resizes and markers remain at correct relative positions
