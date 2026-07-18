# Calendar View Specification

## Purpose

Interactive calendar UI for visualizing project events using FullCalendar with day, week, and month views.

## Requirements

### Requirement: Calendar Page

The system SHALL provide a calendar page at `/projects/{projectId}/calendar/` accessible from the sidebar navigation.

#### Scenario: Navigate to calendar

- GIVEN an authenticated user in a project
- WHEN they click "Calendar" in the sidebar
- THEN the calendar page loads with the current month view

#### Scenario: Sidebar entry visible

- GIVEN the dashboard shell renders
- WHEN the user has project access
- THEN a "Calendar" navigation item appears in the sidebar

### Requirement: Calendar Views

The calendar SHALL support day, week, and month views. Users MAY switch between views.

#### Scenario: Month view default

- GIVEN the calendar page loads
- WHEN no view parameter is specified
- THEN month view displays with events as colored pills

#### Scenario: Switch to week view

- GIVEN the calendar in month view
- WHEN the user clicks "Week"
- THEN the view changes to weekly with time grid

#### Scenario: Switch to day view

- GIVEN the calendar in week view
- WHEN the user clicks "Day"
- THEN the view changes to single-day time grid

### Requirement: Event Display

Events SHALL display on the calendar with title, color, and time. Clicking an event MAY open a detail popover or navigate to the event.

#### Scenario: Event renders on correct date

- GIVEN an event on 2026-03-15
- WHEN March 2026 is viewed
- THEN the event appears on March 15

#### Scenario: Color-coded events

- GIVEN events with different colors
- WHEN the calendar renders
- THEN each event displays in its assigned color

### Requirement: Dynamic Import

FullCalendar SHALL load via `next/dynamic` to keep it out of the main bundle.

#### Scenario: Calendar lazy loads

- GIVEN the calendar page
- WHEN the page first renders
- THEN a loading skeleton shows while FullCalendar chunks load
- AND the main bundle does not include FullCalendar code

### Requirement: Event Source API

The calendar SHALL fetch events from `/api/projects/{projectId}/events` using TanStack Query with date-range parameters derived from the current view.

#### Scenario: Fetch events for visible range

- GIVEN the calendar showing March 2026
- WHEN the view renders
- THEN the API is called with from=2026-02-28&to=2026-04-04 (padded range)

#### Scenario: Refetch on view change

- GIVEN the calendar in March
- WHEN the user navigates to April
- THEN a new API call fetches April events
