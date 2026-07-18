# Exploration: Phase 9 — Dashboard & Reports

## Current State

### What Exists Today

**Global Dashboard** (`apps/web/src/app/(dashboard)/dashboard/page.tsx`):
- Server Component that renders a welcome message + project card grid
- Uses `getDashboardProjects()` which wraps `listProjects(userId)` with React cache
- No metrics, KPIs, or aggregated data — just a project listing

**Project Detail Page** (`apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx`):
- Shows project status and code in two cards
- No summary metrics or activity feed

**Data Model (Prisma schema)**:
- `Item` — has `itemTypeId`, `statusId`, `locationId`, `createdAt`, `updatedAt`
- `Document` — has `expiresAt`, `sizeBytes`, `mimeType`, `createdAt`
- `DocumentVersion` — has `version`, `uploadedBy`, `createdAt`
- `Event` — has `startAt`, `endAt`, `rrule`, `itemId?`
- `Alert` — has `alertType`, `severity`, `status`, `createdAt`
- `Location` — has `level`, `parentId` (adjacency list)
- `ItemType` — has `status` (ACTIVE/ARCHIVED)
- `Status` — has `isFinal`, `isBlocking`, `isIncident`

**Existing Services with query capabilities**:
- `item-service.ts` — `findItemsByProject(projectId, filters)` with pagination
- `document-service.ts` — `findDocumentsByItem(itemId)`, expiration queries
- `event-service.ts` — `findEventsByDateRange(projectId, start, end)`, `generateExpirationEvents()`
- `alert-service.ts` — `listAlerts(projectId, filters)`, `countUnreadAlerts(projectId)`, `scanDocumentExpirations()`, `scanUpcomingEvents()`
- `location-service.ts` — hierarchy queries
- `dashboard-service.ts` — minimal, only wraps `listProjects()`

**Existing Repositories**:
- `alert-repository.ts` — `countUnreadAlerts()`, `listAlerts()` with filters
- `item-repository.ts` — `findItemsByProject()` with type/status/location filters
- `document-repository.ts` — `findExpiringDocuments()`, `findDocumentsByItem()`
- `event-repository.ts` — `findEventsByDateRange()`, `findUpcomingEvents()`

**UI Components** (`packages/ui/src/components/`):
- Primitives: `badge`, `button`, `card` (missing!), `dialog`, `dropdown-menu`, `form`, `input`, `label`, `select`, `switch`, `table`, `textarea`
- No chart, progress, skeleton, or stat components exist

**No existing**: metrics aggregation, CSV export, activity timeline, or report generation

---

## Affected Areas

### Files to Create (new)

| Path | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/projects/[projectId]/dashboard/page.tsx` | Project-level dashboard with KPIs |
| `apps/web/src/app/(dashboard)/projects/[projectId]/dashboard/page.test.tsx` | Tests |
| `apps/web/src/lib/services/metrics-service.ts` | Aggregation queries for dashboard KPIs |
| `apps/web/src/lib/services/metrics-service.test.ts` | Tests |
| `apps/web/src/lib/repositories/metrics-repository.ts` | Prisma aggregation queries |
| `apps/web/src/lib/repositories/metrics-repository.test.ts` | Tests |
| `apps/web/src/components/dashboard/kpi-card.tsx` | Reusable stat card component |
| `apps/web/src/components/dashboard/alert-summary.tsx` | Alert severity breakdown |
| `apps/web/src/components/dashboard/document-stats.tsx` | Document expiration overview |
| `apps/web/src/components/dashboard/activity-timeline.tsx` | Recent activity feed |
| `apps/web/src/components/dashboard/__tests__/` | Component tests |
| `apps/web/src/app/api/projects/[projectId]/metrics/route.ts` | API endpoint for metrics |
| `apps/web/src/app/api/projects/[projectId]/metrics/route.test.ts` | Tests |
| `apps/web/src/app/api/projects/[projectId]/reports/route.ts` | CSV export endpoint |
| `apps/web/src/app/api/projects/[projectId]/reports/route.test.ts` | Tests |

### Files to Modify (existing)

| Path | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Add cross-project summary metrics |
| `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` | Add dashboard nav link |
| `apps/web/src/components/layout/sidebar.tsx` | Add "Dashboard" nav item under project |
| `packages/ui/src/components/` | Add `card.tsx`, `progress.tsx`, `skeleton.tsx` primitives |

### Files to Read (reference, no changes)

| Path | Why |
|------|-----|
| `packages/database/prisma/schema.prisma` | Data model for aggregation queries |
| `apps/web/src/lib/services/alert-service.ts` | Alert scanning patterns |
| `apps/web/src/lib/services/event-service.ts` | Expiration event generation |
| `apps/web/src/lib/repositories/alert-repository.ts` | Existing query patterns |

---

## Approaches

### Approach A: Server-Side Aggregation (Recommended)

Dashboard is a Server Component that calls a `metrics-service` which uses Prisma `groupBy` and `count` aggregations. Data loads on the server, no client-side fetching needed for initial render.

- **Pros**: Follows existing architecture (Server Components by default), fast initial load, no loading spinners for KPIs, consistent with how `dashboard-service.ts` works today
- **Cons**: Full page refresh on data change (acceptable for dashboard), no real-time updates
- **Effort**: Medium

### Approach B: Client-Side with TanStack Query

Dashboard renders a shell, then fetches metrics via API route using `useQuery`. Enables auto-refresh and optimistic updates.

- **Pros**: Real-time feel, auto-refresh, partial updates
- **Cons**: Breaks "Server Components by default" pattern, adds loading states, more complex, inconsistent with existing pages
- **Effort**: Medium-High

### Approach C: Hybrid — Server Initial + Client Refresh

Server Component renders initial KPIs, a Client Component wrapper adds a "Refresh" button or periodic poll via TanStack Query.

- **Pros**: Fast initial load + ability to refresh without full page reload
- **Cons**: Two data paths to maintain, more complex than pure server
- **Effort**: High

---

## Recommendation

**Approach A: Server-Side Aggregation**

Rationale:
1. Matches the established architecture — every existing page is a Server Component
2. The dashboard doesn't need real-time updates — users refresh manually
3. Prisma `groupBy` and `count` are efficient for the data volumes expected
4. Consistent with how `getDashboardProjects()` already works
5. Simpler to test (service tests + component tests, no API route mocking for client)

### Proposed Architecture

```
Dashboard Page (Server Component)
  └── metrics-service.getProjectMetrics(projectId, userId)
        ├── metrics-repository.countItemsByStatus(projectId)
        ├── metrics-repository.countDocumentsByExpiration(projectId)
        ├── metrics-repository.countAlertsBySeverity(projectId)
        └── metrics-repository.getRecentActivity(projectId, limit)
```

### KPI Cards (Project Dashboard)

| KPI | Data Source | Aggregation |
|-----|-----------|-------------|
| Total Items | `Item` | `count` where `itemType.projectId` |
| Items by Status | `Item` | `groupBy(statusId)` with count |
| Active Alerts | `Alert` | `count` where `status = ACTIVE` |
| Alerts by Severity | `Alert` | `groupBy(severity)` where `status = ACTIVE` |
| Documents Expiring Soon | `Document` | `count` where `expiresAt` within 30 days |
| Total Documents | `Document` | `count` where `item.itemType.projectId` |
| Upcoming Events (7d) | `Event` | `count` where `startAt` within 7 days |
| Locations | `Location` | `count` where `projectId` |

### Activity Timeline

Recent activity = last N created/updated records across entities:
- Items created/updated (from `Item.createdAt`, `Item.updatedAt`)
- Documents uploaded (from `DocumentVersion.createdAt`)
- Alerts generated (from `Alert.createdAt`)
- Events created (from `Event.createdAt`)

Implementation: Union query or separate queries with merge-sort by date.

### CSV Export

New API route `GET /api/projects/[projectId]/reports/export?format=csv&type=items|documents|alerts`:
- Reuse existing service list functions with large page size
- Transform to CSV using simple string concatenation (no external lib needed)
- Return with `Content-Type: text/csv` and `Content-Disposition: attachment`

---

## Risks

1. **Performance at scale**: `groupBy` queries on large datasets may be slow. Mitigation: Add database indexes (already exist on `projectId` foreign keys) and limit aggregation windows.
2. **Activity timeline complexity**: No unified activity/audit log exists. The timeline requires querying multiple tables. Mitigation: Keep it simple — last N records per entity type, merged client-side in the component.
3. **Missing UI primitives**: No `Card`, `Progress`, or `Skeleton` components in `@mantemap/ui`. Need to add them. Mitigation: shadcn/ui has these ready to copy.
4. **ADR-005 blocker**: Any schema changes (new indexes for performance) require the Prisma production baseline first. Mitigation: Phase 9 can work without schema changes — all needed indexes already exist.
5. **@mantemap/ui typecheck failure**: Pre-existing `@/lib/utils` resolution error. Mitigation: Work around it or fix it as part of this phase.

---

## Ready for Proposal

**Yes.** The exploration is complete. Key decisions identified:

1. **Architecture**: Server-side aggregation (Approach A)
2. **Scope**: Project-level dashboard with KPIs + activity timeline + CSV export
3. **Global dashboard**: Enhance existing page with cross-project summary
4. **New primitives needed**: Card, Progress, Skeleton in `@mantemap/ui`
5. **No schema changes required**: All needed data and indexes exist

The orchestrator should proceed to `sdd-propose` with:
- Change name: `phase-9-dashboard-reports`
- Scope: Dashboard KPIs, activity timeline, CSV export
- Approach: Server-side aggregation via metrics-service
- Estimated effort: ~600-800 lines (within single PR budget if well-scoped)
