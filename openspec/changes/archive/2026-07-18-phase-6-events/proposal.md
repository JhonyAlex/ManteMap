# Proposal: Events & Calendar

## Intent

ManteMap has no event or calendar system. Users cannot schedule maintenance, track recurring inspections, or visualize document expiration dates on a timeline. This change adds project-scoped events with recurrence and an interactive calendar view.

## Scope

### In Scope
- Event model with CRUD (Prisma + API + UI)
- FullCalendar integration (day/week/month views)
- RRULE-based recurrence with picker UI
- Document expiration events (auto-generated from `Document.expiresAt`)
- Calendar page at `projects/[projectId]/calendar/`
- Sidebar navigation entry

### Out of Scope
- Internal alerts/notifications (deferred to Phase 8)
- Status transition events (audit trail — future)
- External calendar sync (Google/Outlook)
- Drag-and-drop event rescheduling (future iteration)
- Recurrence exception dates

## Capabilities

### New Capabilities
- `event-management`: Event CRUD with project scoping, item association, date range queries, manual events
- `calendar-view`: FullCalendar integration with day/week/month views, dynamic import, event source API
- `recurrence`: RRULE storage via rrule.js, recurrence picker UI, occurrence expansion
- `document-expiration-events`: Auto-generated calendar events from `Document.expiresAt`, color-coded by urgency

### Modified Capabilities
- `document-management`: Expose `expiresAt` as a calendar event source (no spec-level requirement change — implementation only)

## Approach

1. **Prisma**: Add `Event` model (project-scoped, optional item relation, `rrule` string field, UTC dates)
2. **Validation**: Zod schemas in `packages/validation/src/event.ts` (create/update/filter)
3. **Service/Repo**: `event-service.ts` + `event-repository.ts` following existing patterns
4. **API Routes**: `GET/POST /api/projects/[projectId]/events`, `GET/PUT/DELETE .../events/[eventId]` — date-range queries for calendar
5. **Frontend**: FullCalendar via `next/dynamic` (Client Component). TanStack Query for data. `rrule.js` for expansion.
6. **Document Expirations**: API merges manual events + document expiration queries in single response

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modified | Add `Event` model |
| `packages/validation/src/event.ts` | New | Zod schemas |
| `apps/web/src/lib/services/event-service.ts` | New | Business logic |
| `apps/web/src/lib/repositories/event-repository.ts` | New | Prisma queries |
| `apps/web/src/app/api/projects/[projectId]/events/` | New | API routes |
| `apps/web/src/components/events/` | New | Calendar + event components |
| `apps/web/src/app/(dashboard)/projects/[projectId]/calendar/` | New | Calendar page |
| `apps/web/src/components/layout/sidebar.tsx` | Modified | Add Calendar nav item |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FullCalendar bundle (~200KB) | Medium | Dynamic import via `next/dynamic` |
| RRULE edge cases (DST) | Low | Use `rrule.js`, start with common patterns |
| Calendar perf with many events | Low | API paginates by date range |

## Rollback Plan

1. Remove `Event` model from Prisma schema, run `prisma db push`
2. Delete new API routes, services, repos, components
3. Remove sidebar nav entry
4. No impact on existing functionality — Event is a standalone model

## Dependencies

- `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/core`
- `rrule` (RRULE parsing/expansion)
- `date-fns-tz` (timezone conversion)
- Phase 3 (Items) must be complete for item association

## Success Criteria

- [ ] Create/edit/delete events via API and UI
- [ ] Calendar displays day/week/month views with events
- [ ] Recurring events expand correctly from RRULE
- [ ] Document expirations appear on calendar
- [ ] Dynamic import keeps calendar out of main bundle
- [ ] All tests pass (unit + component)
