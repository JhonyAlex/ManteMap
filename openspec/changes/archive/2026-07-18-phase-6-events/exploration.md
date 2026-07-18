# Exploration: Phase 6 — Events & Calendar

## Current State

### What Exists Today

**Data Model**: No Event model exists. The only date-related field is `Document.expiresAt` (DateTime?, indexed). Items have no event or calendar associations.

**Document Model** (`packages/database/prisma/schema.prisma:291-309`):
- `Document` has `expiresAt: DateTime?` with an index
- Documents are scoped to Items, which are scoped to ItemTypes, which are scoped to Projects
- This creates a natural path for "document expiration events" but no dedicated event system

**Dependencies**:
- FullCalendar is mentioned in AGENTS.md line 62 but is **NOT installed** in any package.json
- `date-fns: ^4.4.0` is installed in apps/web — useful for date manipulation
- `react-day-picker: ^10.0.1` is installed — used for date field inputs, NOT a calendar view library
- No `@fullcalendar/*` packages exist in the monorepo

**Calendar UI**: None exists. No `/calendar` route, no calendar components.

**ROADMAP.md Phase 5** (lines 113-125):
- Events CRUD: Create/edit events per item
- Recurrence: Multiple patterns supported
- Calendar: Day/week/month views
- Internal alerts: Notifications for expirations
- Dependencies: Phase 3 complete ✅

**PROMPT MAESTRO.md** (lines 1158-1167):
- Events, dates, recurrence, upcoming dates, calendar, internal alerts

**Routing Pattern** (`apps/web/src/app/(dashboard)/projects/[projectId]/`):
- Currently: `items/` sub-route exists
- Pattern: `projects/[projectId]/[feature]/page.tsx`
- Calendar would naturally live at: `projects/[projectId]/calendar/page.tsx`

**Service/Repository Pattern**:
- Services in `apps/web/src/lib/services/` — business logic, validation, authorization
- Repositories in `apps/web/src/lib/repositories/` — Prisma queries, data access
- API routes in `apps/web/src/app/api/projects/[projectId]/[resource]/route.ts`
- Validation schemas in `packages/validation/src/`

**Component Patterns**:
- Server Components by default, Client Components for interactivity
- shadcn/ui components in `packages/ui/`
- Feature components in `apps/web/src/components/`
- Tests co-located with `__tests__/` directories

### Architecture Patterns to Follow

1. **Event scoping**: Events must be scoped to Projects (like Items, Documents)
2. **Item association**: Events can optionally link to Items (maintenance on a specific asset)
3. **Document expiration**: Could auto-generate events from `Document.expiresAt`
4. **Recurrence**: Needs a storage pattern for recurring event rules
5. **Calendar data**: API must return events in a format FullCalendar consumes

## Affected Areas

### New Files Required

**Prisma Schema** (`packages/database/prisma/schema.prisma`):
- New `Event` model with recurrence support
- New `EventReminder` model for alerts
- Relations to Project, Item (optional), User (creator)

**Validation** (`packages/validation/src/`):
- `event.ts` — Zod schemas for create/update/filter
- Recurrence rule validation (RRULE or custom)

**Services** (`apps/web/src/lib/services/`):
- `event-service.ts` — CRUD, recurrence expansion, authorization

**Repositories** (`apps/web/src/lib/repositories/`):
- `event-repository.ts` — Prisma queries, date range queries

**API Routes** (`apps/web/src/app/api/projects/[projectId]/events/`):
- `route.ts` — GET (list with date range), POST (create)
- `[eventId]/route.ts` — GET, PUT, DELETE

**UI Components** (`apps/web/src/components/events/`):
- `event-dialog.tsx` — Create/edit event modal
- `event-form.tsx` — React Hook Form with recurrence fields
- `calendar-view.tsx` — FullCalendar wrapper (Client Component)
- `calendar-toolbar.tsx` — View switcher, date navigation
- `event-badge.tsx` — Event display in calendar cells

**Pages** (`apps/web/src/app/(dashboard)/projects/[projectId]/calendar/`):
- `page.tsx` — Calendar page (Server Component shell)

### Existing Files to Modify

- `packages/database/prisma/schema.prisma` — Add Event, EventReminder models
- `packages/validation/src/index.ts` — Export event schemas
- `apps/web/src/components/layout/sidebar.tsx` — Add Calendar nav item
- `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` — Potentially add calendar link

## Approaches

### 1. FullCalendar Integration (Recommended)

**Description**: Use FullCalendar's React wrapper (`@fullcalendar/react`) with daygrid, timegrid, and interaction plugins. FullCalendar is the industry standard for calendar views in web apps.

**Pros**:
- Production-ready, battle-tested library
- Day/week/month views built-in
- Drag-and-drop, resize, click interactions
- Event sources API matches our REST pattern
- Good TypeScript support
- Active maintenance and community

**Cons**:
- Bundle size (~200KB gzipped with all plugins)
- Commercial license required for some features (but core is MIT)
- Learning curve for plugin configuration
- SSR complexity (must be Client Component)

**Effort**: Medium

**Packages needed**:
- `@fullcalendar/react` — React wrapper
- `@fullcalendar/daygrid` — Month/day grid view
- `@fullcalendar/timegrid` — Week/day time grid
- `@fullcalendar/interaction` — Drag/drop, click
- `@fullcalendar/core` — Core library (peer dep)

### 2. Custom Calendar with date-fns

**Description**: Build a custom calendar grid using `date-fns` for date manipulation and React for rendering. More control but significantly more work.

**Pros**:
- Full control over rendering and behavior
- Smaller bundle size
- No licensing concerns
- Can optimize for specific use case

**Cons**:
- 2-3 weeks additional development time
- Must implement day/week/month views from scratch
- Drag-and-drop, resizing, navigation all custom
- Testing complexity increases dramatically
- Maintenance burden on the team

**Effort**: High

### 3. React Big Calendar

**Description**: Use `react-big-calendar` — a lighter alternative to FullCalendar with similar features.

**Pros**:
- Smaller bundle than FullCalendar
- Simpler API
- MIT licensed
- Good for basic calendar needs

**Cons**:
- Less polished UI than FullCalendar
- Fewer plugins and customization options
- Smaller community
- Limited drag-and-drop support
- Less active maintenance

**Effort**: Low-Medium

## Recurrence Pattern Analysis

### Option A: RRULE (RFC 5545) — Recommended

**Description**: Store recurrence rules as iCalendar RRULE strings. Use a library like `rrule.js` to expand occurrences.

**Storage**:
```prisma
model Event {
  id          String    @id @default(cuid())
  projectId   String
  itemId      String?   // Optional association
  title       String
  description String?
  start       DateTime
  end         DateTime?
  allDay      Boolean   @default(false)
  rrule       String?   // RRULE string: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  rruleEnd    DateTime? // Recurrence end date
  color       String?
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Pros**:
- Industry standard for recurrence
- Rich expression: weekly, monthly, yearly, complex patterns
- Libraries handle expansion and parsing
- Calendar services (Google, Outlook) use RRULE

**Cons**:
- RRULE syntax is complex for users
- Need UI to generate RRULE strings
- Edge cases with timezones and DST

**Implementation**:
- Store raw RRULE string in `rrule` field
- Use `rrule.js` to expand occurrences for calendar display
- Query database for base events, expand in API or frontend

### Option B: Custom Recurrence Fields

**Description**: Store recurrence as structured fields (frequency, interval, days, etc.)

**Storage**:
```prisma
model Event {
  // ... base fields
  recurrenceType   String?  // NONE, DAILY, WEEKLY, MONTHLY, YEARLY
  recurrenceInterval Int?   // Every N units
  recurrenceDays   String?  // JSON: ["MO","WE","FR"]
  recurrenceEnd    DateTime?
}
```

**Pros**:
- Simpler to query and validate
- Easier UI generation
- No external dependency

**Cons**:
- Limited expression (hard to do "every 3rd Tuesday")
- Custom logic needed for expansion
- Non-standard format

**Effort**: Low

### Recommendation: RRULE with UI Helper

Use RRULE storage with a user-friendly recurrence picker that generates RRULE strings. This gives us standard format, rich expression, and good UX.

## Event Sources for Calendar

### Source 1: Manual Events (Core)

Users create events directly:
- Maintenance schedules
- Inspections
- Training sessions
- Custom events

### Source 2: Document Expirations (Auto-generated)

Query `Document.expiresAt` and display as calendar events:
- No database storage needed — query on demand
- Color-code by urgency (expired, expiring soon, ok)
- Link to document detail

### Source 3: Status Transition Events (Future)

When items change status, log as events:
- Audit trail
- Timeline view
- Not in Phase 6 scope but design should accommodate

## API Design

### GET /api/projects/[projectId]/events

Query parameters:
- `start` — ISO date string (required for calendar view)
- `end` — ISO date string (required for calendar view)
- `itemId` — Filter by item (optional)
- `type` — Filter by source: manual, document, all (default: all)

Response:
```typescript
{
  data: Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    color?: string;
    source: 'manual' | 'document';
    itemId?: string;
    url?: string; // Link to detail
  }>
}
```

### POST /api/projects/[projectId]/events

Body:
```typescript
{
  title: string;
  description?: string;
  start: string; // ISO datetime
  end?: string;
  allDay: boolean;
  itemId?: string;
  rrule?: string;
  rruleEnd?: string;
  color?: string;
}
```

### GET /api/projects/[projectId]/events/[eventId]

Full event details with item association, creator info, reminders.

### PUT /api/projects/[projectId]/events/[eventId]

Update event. Handle recurrence: update single vs. all occurrences.

### DELETE /api/projects/[projectId]/events/[eventId]

Delete event. Handle recurrence: delete single vs. all occurrences.

## Frontend Architecture

### Calendar Page Structure

```
projects/[projectId]/calendar/
└── page.tsx (Server Component)
    └── CalendarView (Client Component)
        ├── CalendarToolbar (view switcher, date nav)
        ├── FullCalendar (main calendar)
        └── EventDialog (create/edit modal)
```

### Data Flow

1. **Server Component** fetches project, user permissions
2. **Client Component** uses TanStack Query for events
3. **FullCalendar** receives events via `events` prop or `eventSource`
4. **Click/Select** opens EventDialog
5. **Create/Update** calls API, invalidates query cache

### FullCalendar Configuration

```typescript
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  selectable: true,
  editable: true,
  eventClick: handleEventClick,
  dateClick: handleDateClick,
  select: handleSelect,
  events: fetchEvents, // URL or callback
};
```

## Risks

### 1. FullCalendar Bundle Size

**Risk**: ~200KB gzipped could impact initial load.
**Mitigation**: Dynamic import (`next/dynamic`) for calendar component. Only load when user navigates to calendar page.

### 2. Recurrence Complexity

**Risk**: RRULE edge cases (DST transitions, timezone handling, exception dates).
**Mitigation**: Use battle-tested `rrule.js` library. Start with common patterns (daily, weekly, monthly) and add complex patterns later.

### 3. Calendar Performance with Many Events

**Risk**: Loading thousands of events for a month view could be slow.
**Mitigation**: Paginate by date range. API returns only events in visible range. Use virtual scrolling if needed.

### 4. Timezone Handling

**Risk**: Events created in different timezones could display incorrectly.
**Mitigation**: Store all dates in UTC. Convert to user timezone for display. Use `date-fns-tz` for conversion.

### 5. Recurrence Exception Dates

**Risk**: Users may want to skip or modify specific occurrences of recurring events.
**Mitigation**: Add `exceptions` JSON field to Event model for skipped dates. Start without exceptions, add in future iteration.

## Ready for Proposal

**Yes** — The exploration is complete. The orchestrator should:

1. **Confirm FullCalendar choice** — or discuss alternatives if bundle size is a concern
2. **Confirm RRULE approach** — or discuss custom recurrence fields for simplicity
3. **Define Phase 6 scope** — which sources (manual, document expirations) to include
4. **Proceed to proposal** with clear scope: Event model, FullCalendar integration, recurrence, calendar page

**Key decisions needed**:
- FullCalendar vs. alternative (recommendation: FullCalendar)
- RRULE vs. custom recurrence (recommendation: RRULE)
- Include document expiration events? (recommendation: yes, as separate slice)
- Include reminders/notifications? (recommendation: defer to Phase 8)

## Recommended Phase 6 Slices

1. **Slice 1**: Event model + CRUD API + validation schemas
2. **Slice 2**: FullCalendar integration + calendar page
3. **Slice 3**: Recurrence (RRULE) + recurrence picker UI
4. **Slice 4**: Document expiration events (auto-generated from Document.expiresAt)

Each slice independently verifiable and deployable.
