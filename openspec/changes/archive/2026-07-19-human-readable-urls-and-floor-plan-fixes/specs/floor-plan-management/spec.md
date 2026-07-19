# Delta for Floor Plan Management

## ADDED Requirements

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

## MODIFIED Requirements

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
