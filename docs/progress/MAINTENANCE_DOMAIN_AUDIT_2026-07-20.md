# Maintenance Domain Functional Audit

**Date:** 2026-07-20
**Status:** Phase 1 — audit and design input; no production code changed.

## Verified current user flow

1. A user can create a project, configure item types, fields and statuses, create items, assign locations, and attach documents.
2. Manual events can be created through the API and may have an item and RRULE. The calendar expands them only for display.
3. The calendar renders manual events and document-expiry entries, but its event form and popover are disconnected from callers.
4. Floor plans can be uploaded and rendered with points and polygons. The current consumer disables dragging and does not provide marker-click handling.
5. Marker APIs exist, but no UI consumes the marker-creation flow; users cannot associate an item with a marker through the application.
6. Document/event alerts require `POST /alerts/scan`; there is no scheduled execution. Recurring events are not expanded for alerting.

## Functional inventory

| Area | Status | Verified finding |
| --- | --- | --- |
| Projects, item types, fields, statuses, items | Complete | Existing model and user flows support this configuration. |
| Documents, versions and expiry dates | Complete | Document models and expiry entries exist. |
| Manual events API | Partial | CRUD/RRULE exist, but they are not an operational maintenance domain. |
| Calendar | Partial / disconnected | Render works; create, edit and detail UI components have no callers. |
| Preventive maintenance | Missing | No `MaintenancePlan`, `WorkOrder`, task generator, checklist or history. |
| Document alerts | Partial | Scan is manually invoked; deduplication exists for alert records. |
| Recurring-event alerts | Incomplete | RRULE is not expanded and historical events are included. |
| Floor plans, layers and polygons | Partial | Rendering works; marker configuration and item side panel are missing. |
| Item-linked markers | Disconnected | API exists, but it has no application UI workflow. |
| Dashboard | Partial | KPIs/timeline exist; no configuration checklist or operational maintenance metrics. |

## Documentation differences

- README/ROADMAP describe maintenance capability, while the implementation only offers generic events.
- The event OpenSpec describes calendar creation/editing, but `EventFormDialog` and `EventPopover` are not wired.
- The floor-plan viewer supports a marker callback, but its page does not supply it.
- `CURRENT_STATUS.md` reports older test and phase status than `AGENTS.md`.

## Risks to address before expanding the feature

1. **Critical — floor-plan project isolation:** floor-plan and marker operations accept a project from the URL but look up the plan only by `floorPlanId`; they must prove the plan belongs to that project.
2. **High — non-autonomous alerts:** manual scans cannot guarantee preventive notification.
3. **High — visual-only recurrence:** occurrences have no durable identity or completion semantics.
4. **Medium — timezone gap:** project configuration has no typed timezone, making local dates and DST unsafe.
5. **Medium — marker integrity:** current validation does not prevent invalid cross-project item associations or duplicate markers.

## Proposed domain direction

Introduce additive `MaintenancePlan`, `WorkOrder`, generation-run/audit history and a typed project timezone. A plan owns an item, fixed date or RRULE, duration, priority, notice period, responsible party, checklist, active state and next generation cursor. A work order is the durable occurrence with stored status `PENDING`, `IN_PROGRESS`, `COMPLETED` or `CANCELLED`; overdue is derived from its due/scheduled timestamp and nonterminal state.

Generation must use a stable occurrence key plus a database unique constraint, run in transactions, and retain each run's result. Existing generated work orders, especially completed ones, remain immutable: plan changes apply prospectively from an effective date; disabling a plan stops future generation while preserving history. Any mass cancellation requires an explicit, audited operation.

## Delivery phases and acceptance gates

1. **Design closure:** define recurrence, responsibility, permissions and floor-plan isolation rules.
2. **Model and migration:** additive schema, timezone, unique occurrence key, project-scoped foreign-key validation, generation history and negative isolation tests.
3. **Services and generator:** transactional idempotent generation, safe regeneration, scheduler boundary and tests for concurrency/DST.
4. **Operational calendar:** real work-order records, filters, creation/editing and navigation.
5. **Floor plans:** marker configuration, access control, accessible item side panel and mobile-safe points/polygons.
6. **Alerts:** maintenance alert types, deduplication and stalled-plan detection.
7. **Onboarding:** setup checklist, empty states and optional Industrial Maintenance template.
8. **QA/docs:** unit, integration and Playwright coverage; synchronize project documentation and specs.

### Phase 2 acceptance criteria

- Additive migration only; no applied migration is modified.
- Project timezone and maintenance plans/work orders are typed and project-scoped.
- A unique `(planId, occurrenceKey)` identity prevents concurrent duplicate generation.
- Fixed and RRULE plans have mutually coherent validation and DST/timezone coverage.
- Generation attempts leave durable success, skip and failure evidence.
- Floor-plan and marker APIs reject cross-project resource access and invalid item associations.

## Source areas and size debt

- `apps/web/src/lib/services/event-service.ts` — calendar/event behavior.
- `apps/web/src/lib/services/alert-service.ts` — alert scanning and deduplication.
- `apps/web/src/lib/services/floor-plan-service.ts` — floor-plan/marker access control.
- `apps/web/src/components/events/calendar-view.tsx` — calendar integration.
- `apps/web/src/components/floor-plans/floor-plan-viewer.tsx` — canvas behavior.
- `packages/database/prisma/schema.prisma` — future domain schema.

Production files above the repository guideline include `fields/page.tsx` (1,038 lines), `locations/page.tsx` (733), `statuses/page.tsx` (662), `notification-channels/page.tsx` (653), `floor-plans/page.tsx` (633), `notification-template-service.ts` (439), `event-form-dialog.tsx` (355), `floor-plan-service.ts` (349), `item-detail.tsx` (303), `event-service.ts` (276) and `metrics-service.ts` (268). Refactor only the relevant ones when modifying them.

## Business decision resolved

ADR-009 freezes the decision: an hourly idempotent generator uses a project horizon of 90 days by default (configurable 30–365), automatically recovers the last 30 days as overdue-derived occurrences, and requires explicit audited backfill or discard for older gaps. Project timezone is required IANA data with `Europe/Madrid` as the initial default.
