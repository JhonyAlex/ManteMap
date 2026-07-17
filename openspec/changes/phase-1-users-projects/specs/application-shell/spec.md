# Application Shell Specification

## Purpose

Define the protected responsive workspace experience for authenticated project work.

## Requirements

### Requirement: Protected application shell

The application MUST provide an authenticated shell containing project-aware navigation, a sidebar, and breadcrumbs. Unauthenticated visitors MUST remain outside the protected shell and be directed to public authentication entry points.

#### Scenario: Authenticated workspace navigation

- GIVEN a valid session and an accessible project context
- WHEN the user opens a protected workspace route
- THEN the shell renders navigation, sidebar, breadcrumbs, and the relevant project content

#### Scenario: Unauthenticated shell request

- GIVEN no valid session exists
- WHEN a protected workspace route is opened
- THEN the user is redirected or denied and protected shell content is not rendered

### Requirement: Responsive and accessible navigation

The shell MUST remain usable across supported desktop and mobile viewport sizes. Navigation state MUST clearly identify the current workspace context and MUST NOT expose projects the user cannot access.

#### Scenario: Mobile workspace use

- GIVEN an authenticated member uses a supported mobile viewport
- WHEN the user opens navigation and changes project context
- THEN navigation remains operable and only accessible project destinations are offered

#### Scenario: Inaccessible context

- GIVEN the current project context is not accessible to the authenticated user
- WHEN the shell resolves that context
- THEN protected project content is withheld and an appropriate access result is shown

### Requirement: Out-of-scope shell features

The shell MUST NOT introduce invitations, detailed permission administration, destructive deletion controls, or unrelated domain capabilities in this phase.

#### Scenario: Scope-preserving navigation

- GIVEN the Phase 1 shell is rendered
- WHEN available actions are displayed
- THEN only authentication, project, membership-scoped access, and navigation actions are represented
