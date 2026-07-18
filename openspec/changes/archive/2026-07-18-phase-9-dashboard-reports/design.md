# Design: Phase 9 — Dashboard & Reports

## Technical Approach

Render project and global dashboards as Server Components. A function-based `metrics-service` enforces membership before calling a dedicated Prisma repository; independent counts/grouped reads run concurrently and use existing relational filters and indexes. Recent activity is normalized and merged in the service. The only new HTTP endpoint is the authenticated CSV download route; no client polling, metrics API, or schema change is introduced.

## Architecture Decisions

| Decision | Alternatives / tradeoff | Choice and rationale |
|---|---|---|
| Data loading | Client Query enables refresh but adds JavaScript and a second data path. | Server Components call services directly, matching existing pages and keeping metric UI non-interactive. |
| Aggregation | Reusing paginated list services over-fetches records; raw SQL couples to PostgreSQL. | Dedicated Prisma `count`, relation-filtered reads, and `groupBy` queries return only aggregate/projection data. |
| Global scope | Accepting project IDs from callers risks scope expansion. | `dashboard-service` derives IDs from cached `getDashboardProjects(userId)` and passes only those IDs to the repository. |
| Activity | A unified log needs migration; database union needs raw SQL. | Fetch at most `limit` rows per source, normalize, sort descending by timestamp with `kind:id` tie-break, then slice to `limit`. Fetching N per source is sufficient for a global top N. |
| CSV | A dependency adds surface area; UI list pagination cannot export all item types. | Use dedicated project-scoped projections and a pure RFC 4180 serializer with formula-injection neutralization. |

## Data Flow

```text
Project page → metrics-service → requireProjectMember → metrics-repository → Prisma
                                      └→ normalize + merge activity
Global page  → dashboard-service → accessible project IDs → metrics-repository
CSV request  → session → metrics-service access check → report projection → serializer → Response
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/lib/repositories/metrics-repository.ts` | Create | Aggregate queries, bounded source projections, and report projections. |
| `apps/web/src/lib/services/metrics-service.ts` | Create | Access-checked metrics, activity normalization, and CSV generation. |
| `apps/web/src/lib/{repositories,services}/metrics-*.test.ts` | Create | Repository contracts and service behavior. |
| `apps/web/src/app/(dashboard)/projects/[projectId]/dashboard/{page,loading}.tsx` | Create | Authorized dashboard and semantic skeleton fallback. |
| `apps/web/src/app/api/projects/[projectId]/reports/{route,route.test}.ts` | Create | CSV endpoint and route contract tests. |
| `apps/web/src/components/dashboard/*.tsx` | Create | KPI grid, breakdowns, global summary, export links, and activity timeline. |
| `packages/ui/src/components/{card,progress,skeleton}.tsx` | Create | Dependency-free, accessible shared primitives using relative `cn` imports. |
| `apps/web/src/app/(dashboard)/dashboard/{page,page.test}.tsx` | Modify | Render accessible-project summary and existing project cards. |
| `apps/web/src/lib/services/dashboard-service.ts` | Modify | Cache projects plus cross-project aggregate result. |
| `apps/web/src/components/layout/{sidebar,sidebar.test}.tsx` | Modify | Add active project Dashboard navigation. |
| `packages/ui/src/index.ts` | Modify | Export new primitives. |

## Interfaces / Contracts

```ts
type ReportType = 'items' | 'documents' | 'alerts';
type ActivityKind = 'item_created' | 'item_updated' | 'document_uploaded' | 'alert_created' | 'event_created';
type ActivityEntry = { id: string; kind: ActivityKind; title: string; href: string; timestamp: Date };

getProjectMetrics(projectId: string, userId: string, now?: Date): Promise<ProjectMetrics>;
getRecentActivity(projectId: string, userId: string, limit?: number): Promise<ActivityEntry[]>;
exportProjectCsv(projectId: string, userId: string, type: ReportType): Promise<string>;
```

`ProjectMetrics` contains total items, status counts (including unassigned), active alerts and severity counts, total/30-day-expiring documents, 7-day upcoming events, and active locations. Repository functions accept trusted project IDs and explicit `now`; services own authorization.

`GET /api/projects/{projectId}/reports?type=items|documents|alerts` returns `400` for invalid type, `401` without session, `404` for missing/non-member projects, and `200` with `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="{project-code}-{type}-{YYYY-MM-DD}.csv"`, and `Cache-Control: private, no-store`. Fields are always quoted, quotes doubled, rows use CRLF, and cells whose trimmed value starts with `=`, `+`, `-`, or `@` receive a leading apostrophe.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Windows, grouped counts, deterministic activity merge/cap, escaping/formula defense | Vitest with injected clock and Prisma mocks. |
| Component | KPI labels, zero/empty states, timeline semantics, responsive content | Testing Library against async Server Components and presentation components. |
| Route | 400/401/404/500 mapping, headers, project scope, each report type | Invoke route handlers with mocked auth/service. |
| E2E | Member dashboard and CSV download; non-member concealment | Playwright critical-flow coverage when its runtime is available. |

## Threat Matrix

N/A — ordinary HTTP API routing is present, but there is no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Deliver as stacked-to-main slices: shared primitives, data/service layer, then pages/report route. Rollback is file-only.

## Open Questions

None.
