# Delta for Floor Plan Viewer

## MODIFIED Requirements

### Requirement: Canvas rendering with dynamic import

FloorPlanViewer MUST use React Konva with `dynamic(() => import(...), { ssr: false })`. The component SHALL NOT load during SSR. Canvas MUST render the floor plan image as background layer.

#### Scenario: Lazy load on page visit

- GIVEN a floor plan page
- WHEN the user navigates to it
- THEN the Konva canvas loads dynamically without SSR errors

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
