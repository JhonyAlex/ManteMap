# Proposal: Phase 9 — Dashboard & Reports

## Intent

Give project members an actionable operational overview instead of requiring them to inspect items, documents, alerts, events, and locations separately. Extend the global dashboard with a cross-project summary and provide a safe CSV export for operational follow-up.

## Scope

### In Scope
- Project dashboard KPIs: items by status, active alerts by severity, total and expiring documents, upcoming events, and locations.
- A bounded recent-activity timeline from items, document versions, alerts, and events.
- CSV export for items, documents, and alerts, with project access enforcement and download headers.
- Cross-project summary on the existing global dashboard.
- Shared accessible `Card`, `Progress`, and `Skeleton` primitives plus reusable dashboard presentation components.

### Out of Scope
- Real-time refresh, polling, or push updates.
- Advanced charts, PDF generation, scheduled reports, or external delivery.
- A unified audit-log model or migration of historical activity.
- Prisma schema or index changes.

## Capabilities

### New Capabilities
- `dashboard-reporting`: Project and cross-project operational metrics, bounded activity, and authorized CSV exports.

### Modified Capabilities
None.

## Approach

Use Server Components to call a project-access-checked `metrics-service`, backed by a dedicated Prisma aggregation repository. Count/group queries use existing project-scoped data and indexes; timeline records are fetched per source, normalized, merged, and capped. Reuse existing list/service behavior for CSV serialization. No client metric polling or schema migration is introduced.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/lib/{services,repositories}/metrics-*` | New | Authorized aggregation and activity queries. |
| `apps/web/src/app/(dashboard)/.../dashboard` | New | Project dashboard page. |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Modified | Cross-project summary. |
| `apps/web/src/app/api/projects/[projectId]/reports/route.ts` | New | CSV download endpoint. |
| `apps/web/src/components/dashboard/` | New | KPI, summary, and timeline UI. |
| `packages/ui/src/components/` | New | Card, Progress, and Skeleton primitives. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Aggregations slow at scale | Med | Bounded windows, grouped counts, and focused query tests. |
| Timeline lacks a unified log | Med | Normalize and cap source records; defer audit migration. |
| CSV injection or unauthorized export | Low | Escape fields and require project membership server-side. |
| Existing UI typecheck alias failure | Med | Correct or isolate it before exporting new primitives. |

## Rollback Plan

Revert the dashboard pages, metrics/report routes, and UI exports together. No persisted data or schema changes require rollback.

## Dependencies

- Existing project-access, item, document, alert, event, and location data/services.
- Existing Prisma indexes; ADR-005 is not a blocker because this change adds no schema changes.

## Success Criteria

- [ ] Authorized members see all eight project KPI groups and a capped timeline; non-members receive no data.
- [ ] Global dashboard summarizes only projects accessible to the signed-in user.
- [ ] CSV exports for items, documents, and alerts download valid escaped CSV with project-scoped rows only.
- [ ] Unit/component/route tests cover aggregation, access control, empty states, and CSV escaping.
