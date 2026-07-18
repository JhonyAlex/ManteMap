# Tasks: Events & Calendar

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend → PR 2: Frontend |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Event backend: Prisma model, Zod schemas, repository, service, API routes, doc expiration merging | PR 1 | `pnpm --filter @mantemap/database exec prisma db push --skip-generate && pnpm --filter @mantemap/validation test && pnpm test -- --reporter=verbose event` | `curl /api/projects/{id}/events?from=...&to=...` | Delete `Event` model, `event.ts`, `event-repository.ts`, `event-service.ts`, API routes — no impact on existing code |
| 2 | Calendar frontend: hooks, FullCalendar component, event form dialog, page, sidebar nav, doc expiration display, component tests | PR 2 (base: PR 1 branch) | `pnpm test -- --reporter=verbose calendar && pnpm test -- --reporter=verbose event-form` | Navigate to `/projects/{id}/calendar/` in browser | Delete `components/events/`, `hooks/use-events.ts`, calendar page, sidebar entry — reverts to pre-calendar state |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Add `Event` model to `packages/database/prisma/schema.prisma` — projectId, itemId?, title, description?, startAt, endAt, allDay, rrule?, color?, indexes on [projectId, startAt] and [projectId, endAt]
- [x] 1.2 Run `pnpm --filter @mantemap/database exec prisma db push` to sync schema
- [x] 1.3 Create `packages/validation/src/event.ts` with `createEventSchema` (title min 1, startAt datetime, endAt after startAt, rrule? string, color? hex), `updateEventSchema` (all optional), `eventFilterSchema` (start/end datetime range)
- [x] 1.4 RED: Write failing tests in `packages/validation/src/__tests__/event.test.ts` — valid create, invalid date range (endBeforeStart), missing title, valid filter, malformed rrule accepted at validation layer
- [x] 1.5 GREEN: Verify Zod schemas pass all validation tests
- [x] 1.6 Create `apps/web/src/lib/repositories/event-repository.ts` — `createEvent`, `findEventById`, `findEventsByDateRange(projectId, start, end)`, `updateEvent`, `deleteEvent`
- [x] 1.7 Create `apps/web/src/lib/services/event-service.ts` — project access check, CRUD delegation to repo, `getEventsInRange` merging manual events + doc expiration events from `document-repository.findExpiringDocuments()`, color-coded by urgency (red=expired, yellow=<30d, default)
- [x] 1.8 Create `apps/web/src/app/api/projects/[projectId]/events/route.ts` — GET (date-range query, type filter) + POST (Zod validate, create via service)
- [x] 1.9 Create `apps/web/src/app/api/projects/[projectId]/events/[eventId]/route.ts` — GET + PUT + DELETE with 403 cross-project guard
- [x] 1.10 RED: Write failing tests for `event-repository.ts` — create, findByDateRange filters correctly, update partial, delete removes
- [x] 1.11 RED: Write failing tests for `event-service.ts` — CRUD, date-range merge with doc expirations, color assignment logic, cross-project denied
- [x] 1.12 GREEN: Implement logic to make all repo + service tests pass
- [x] 1.13 REFACTOR: Extract doc expiration color logic to shared utility if service exceeds 250 lines

## Phase 2: Frontend (PR 2)

- [x] 2.1 Create `apps/web/src/hooks/use-events.ts` — TanStack Query hooks (`useEvents(projectId, start, end)`, `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`) + query key factory
- [x] 2.2 Create `apps/web/src/components/events/calendar-view.tsx` — FullCalendar wrapper as Client Component, dynamic import via `next/dynamic`, dayGridMonth/timeGridWeek/timeGridDay views, event source from `useEvents`, loading skeleton
- [x] 2.3 Create `apps/web/src/components/events/event-form-dialog.tsx` — Dialog with React Hook Form + Zod, recurrence picker (frequency select, interval, day-of-week for weekly), RRULE preview text, color picker
- [x] 2.4 Create `apps/web/src/components/events/event-popover.tsx` — Click event popover showing title, dates, type. Doc expiration events show read-only (no edit/delete)
- [x] 2.5 Create `apps/web/src/app/(dashboard)/projects/[projectId]/calendar/page.tsx` — Server Component with auth check, renders CalendarView
- [x] 2.6 Modify `apps/web/src/components/layout/sidebar.tsx` — Add "Calendar" nav link with calendar icon under active project section
- [x] 2.7 RED: Write failing component tests for CalendarView — renders loading skeleton, displays events, switches views, navigates months
- [x] 2.8 GREEN: Implement CalendarView to pass tests
- [x] 2.9 RED: Write failing component tests for EventFormDialog — validates required fields, builds RRULE from picker, submits payload, rejects invalid dates
- [x] 2.10 GREEN: Implement EventFormDialog to pass tests
- [x] 2.11 REFACTOR: Recurrence picker integrated inline in EventFormDialog (under 200 lines, no extraction needed)
- [x] 2.12 Verify: `pnpm lint && pnpm typecheck && pnpm test` all pass
