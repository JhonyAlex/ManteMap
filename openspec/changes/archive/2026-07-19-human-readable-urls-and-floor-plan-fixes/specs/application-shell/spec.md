# Application Shell Specification

## Purpose

Protected navigation shell with sidebar, breadcrumbs, and project routing. Breadcrumbs MUST resolve human-readable names for all entity types. Project page routes MUST use `project.code` instead of raw `project.id` CUIDs.

## Requirements

### Requirement: Breadcrumb name resolution

The breadcrumbs component MUST resolve human-readable names for all entity types in URLs. The resolution map SHALL include: `projectNames`, `itemTypeNames`, `itemNames`, `floorPlanNames`, `locationNames`, and `eventNames`. When a URL segment matches a known entity ID, the breadcrumb SHALL display the entity name; otherwise it SHALL fall back to the raw segment value.

Entity name maps SHALL be fetched server-side in the dashboard layout and passed as props to the Breadcrumbs client component.

#### Scenario: Project breadcrumb shows name

- GIVEN a URL `/projects/MAP-001/floor-plans`
- WHEN breadcrumbs render
- THEN the breadcrumb shows "Project Name > Floor Plans"
- NOT "MAP-001 > Floor Plans" or raw CUIDs

#### Scenario: Floor plan breadcrumb shows name

- GIVEN a URL `/projects/MAP-001/floor-plans/clxabc123`
- WHEN breadcrumbs render
- THEN the breadcrumb shows "Project Name > Floor Plans > Ground Floor"
- NOT "clxabc123"

#### Scenario: Item breadcrumb shows name

- GIVEN a URL `/projects/MAP-001/items/clxdef456`
- WHEN breadcrumbs render
- THEN the breadcrumb shows "Project Name > Items > Fire Extinguisher A-12"

#### Scenario: Unknown segment falls back to raw value

- GIVEN a URL segment not matching any entity ID map
- WHEN breadcrumbs render
- THEN the segment displays as capitalized, hyphen-stripped raw text

### Requirement: Project routes use code

All page routes under `(dashboard)/projects/` MUST use `[projectCode]` dynamic segment instead of `[projectId]`. The `project.code` field is `@unique` and already exists — no DB migration is needed.

Sidebar links and all internal navigation SHALL use `project.code` when building project URLs (e.g., `/projects/MAP-001/items`).

#### Scenario: Dashboard URL uses project code

- GIVEN a project with code "FAC-2024" and id "clxzzz111"
- WHEN the user navigates to the project dashboard
- THEN the URL is `/projects/FAC-2024`
- NOT `/projects/clxzzz111`

#### Scenario: Sidebar links use project code

- GIVEN a sidebar showing the active project's sub-navigation
- WHEN links are rendered
- THEN all links use the project's code (e.g., `/projects/FAC-2024/items`)

### Requirement: Project CUID redirect backward compatibility

The system MUST provide a redirect route at `(dashboard)/projects/[projectId]/` that resolves the CUID to its project code and issues a 301 redirect to `(dashboard)/projects/[projectCode]/`. This SHALL preserve existing bookmarks and external links.

#### Scenario: Old CUID URL redirects

- GIVEN a user with a bookmark to `/projects/clxabc.../floor-plans`
- WHEN the browser navigates to that URL
- THEN the server returns 301 redirect to `/projects/MAP-001/floor-plans`

#### Scenario: Invalid CUID returns 404

- GIVEN a URL with a nonexistent project CUID
- WHEN the browser navigates there
- THEN the server returns 404

### Requirement: Responsive and accessible navigation

The application shell MUST include a skip-to-content link, a responsive sidebar (mobile toggle with overlay), and semantic landmarks. The sidebar SHALL be a client component; the layout SHALL be a Server Component. Touch targets SHALL be at least 44×44 CSS pixels.

#### Scenario: Keyboard navigation

- GIVEN a user navigating with Tab key
- WHEN the page loads
- THEN the skip-to-content link receives focus first
- AND all sidebar links are keyboard-accessible
