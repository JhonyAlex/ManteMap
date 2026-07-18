# Tasks: Phase 9 — Dashboard & Reports

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Test command | Rollback boundary |
|------|------|----|--------------|-------------------|
| 1 | Shared UI + types | PR 1 | `pnpm --filter @mantemap/ui test` | `packages/ui/src/components/{card,progress,skeleton}.tsx` |
| 2 | Repository, service, CSV, route | PR 2 | `pnpm --filter web test -- --grep "metrics"` | `metrics-*` + `api/.../reports/` |
| 3 | Dashboard pages + components | PR 3 | `pnpm --filter web test -- --grep "dashboard"` | `components/dashboard/` + page routes |

---

## Phase 1: Foundation — Shared UI & Types (PR 1)

- [x] 1.1 RED: Tests for Card in `packages/ui/src/components/card.test.tsx` — children, className, ref, asChild
- [x] 1.2 GREEN: Create `packages/ui/src/components/card.tsx` — Card/CardHeader/CardTitle/CardContent/CardFooter
- [x] 1.3 RED: Tests for Progress in `progress.test.tsx` — value/max, aria-valuenow
- [x] 1.4 GREEN: Create `packages/ui/src/components/progress.tsx` — role="progressbar"
- [x] 1.5 RED: Tests for Skeleton in `skeleton.test.tsx` — pulse, aria-hidden
- [x] 1.6 GREEN: Create `packages/ui/src/components/skeleton.tsx`
- [x] 1.7 Export Card, Progress, Skeleton from `packages/ui/src/index.ts`
- [x] 1.8 RED+GREEN: `packages/shared/src/types/metrics.ts` + test — ProjectMetrics, ActivityEntry, ActivityKind, ReportType

## Phase 2: Data Layer — Repository, Service, CSV, Route (PR 2)

- [x] 2.1 RED: Prisma mock tests for `metrics-repository.ts` — count/group queries, activity projections, report projections
- [x] 2.2 GREEN: Create `apps/web/src/lib/repositories/metrics-repository.ts` — count, groupBy, bounded activity, project-scoped projections
- [x] 2.3 RED: Tests for `csv-serializer.test.ts` — RFC 4180, CRLF, doubled quotes, formula-injection escape
- [x] 2.4 GREEN: Create `apps/web/src/lib/services/csv-serializer.ts` — `toCsv()`, `escapeFormulaInjection()`
- [x] 2.5 RED: Tests for `metrics-service.ts` — membership enforcement, activity normalize/merge/cap, CSV delegation
- [x] 2.6 GREEN: Create `apps/web/src/lib/services/metrics-service.ts` — requireProjectMember, concurrent reads, timeline, CSV
- [x] 2.7 RED: Route tests for `reports/route.test.ts` — 400/401/404/200, headers, project scope
- [x] 2.8 GREEN: Create `apps/web/src/app/api/projects/[projectId]/reports/route.ts` — GET handler, auth, CSV Response

## Phase 3: UI Integration — Pages, Components, Nav (PR 3)

- [x] 3.1 RED+GREEN: `apps/web/src/components/dashboard/kpi-grid.tsx` — Card grid, zero/empty, ARIA, Skeleton
- [x] 3.2 RED+GREEN: `apps/web/src/components/dashboard/activity-timeline.tsx` — newest-first, kind badges, empty state
- [x] 3.3 RED+GREEN: `apps/web/src/components/dashboard/project-summary-card.tsx` — Card with counts
- [x] 3.4 RED+GREEN: `apps/web/src/components/dashboard/export-links.tsx` — 3 CSV download links
- [x] 3.5 Create `loading.tsx` under `projects/[projectId]/dashboard/` — Skeleton layout
- [x] 3.6 RED: Tests for project dashboard page — authorized KPIs+timeline, non-member 404
- [x] 3.7 GREEN: Create `projects/[projectId]/dashboard/page.tsx` — Server Component, metrics+activity+exports
- [x] 3.8 RED: Tests for global dashboard — cross-project summaries, empty state
- [x] 3.9 GREEN: Modify `dashboard/page.tsx` — add ProjectSummaryCard grid
- [x] 3.10 Modify `dashboard-service.ts` — add `getCrossProjectMetrics(userId)`
- [x] 3.11 Modify `sidebar.tsx` — add Dashboard link per active project