# Floor Plan View Specification

## Purpose

Individual floor plan page with embedded interactive viewer, server-side data fetching, and image access via dedicated API endpoint.

## Requirements

### Requirement: Floor plan view page

The system MUST serve an individual floor plan view page at `(dashboard)/projects/[projectCode]/floor-plans/[floorPlanId]/page.tsx`. The page SHALL be a Server Component that fetches floor plan metadata and markers server-side before rendering.

The `[projectCode]` segment SHALL use the project's `code` field (not `id`). The page SHALL require project membership; non-members SHALL receive 404.

#### Scenario: View floor plan with markers

- GIVEN a project member navigating to `/projects/MAP-001/floor-plans/clxabc123`
- WHEN the page loads
- THEN the floor plan name appears as page title
- AND the FloorPlanViewer renders with the plan image
- AND all markers for that plan are visible on the canvas

#### Scenario: Non-existent floor plan

- GIVEN a project member navigating to `/projects/MAP-001/floor-plans/nonexistent`
- WHEN the page loads
- THEN the page displays a 404 state

#### Scenario: Unauthorized access

- GIVEN a non-member navigating to a floor plan view page
- WHEN the page loads
- THEN the page returns 404 (not 403 — don't leak existence)

### Requirement: Image URL resolution

The view page SHALL pass an API endpoint URL as `imageUrl` prop to FloorPlanViewer: `/api/projects/{projectId}/floor-plans/{floorPlanId}/image`. The image SHALL NOT be loaded via direct storage path.

#### Scenario: Image loads from API

- GIVEN a floor plan view page
- WHEN the FloorPlanViewer renders
- THEN the Konva canvas loads the background image from the API endpoint
- AND the response has correct `Content-Type` based on file extension

### Requirement: Navigation from list page

The floor plan list page's "View" link SHALL use Next.js `<Link>` component for client-side navigation. The href SHALL point to `/projects/{projectCode}/floor-plans/{planId}`.

#### Scenario: Client-side navigation from list

- GIVEN the floor plans list page at `/projects/MAP-001/floor-plans`
- WHEN the user clicks the "View" link for a plan
- THEN the browser navigates client-side without full-page reload
- AND the floor plan view page renders
