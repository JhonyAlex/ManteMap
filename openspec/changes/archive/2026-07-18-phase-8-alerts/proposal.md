# Proposal: Phase 8 — Alerts & Notifications

## Intent

ManteMap lacks proactive alerting. Expirations, maintenance events, and critical status changes go unnoticed until manual check. This phase adds persistent in-app alerts.

## Scope

### In Scope
- `Alert` Prisma model (type, severity, status, relations to Item/Document/Event)
- `NotificationPreference` model (user + project scoped)
- Event-triggered alerts + `/alerts/scan` endpoint for time-based alerts
- CRUD API + acknowledgment/dismissal
- Dashboard page with filters (type, severity, status)
- Notification bell with unread count
- Deduplication via unique constraint `(sourceType, sourceId, alertType)`

### Out of Scope
- Email/external notifications (Phase 9)
- Background cron, push notifications, escalation workflows

## Capabilities

### New Capabilities
- `alert-management`: Alert model, generation service, CRUD API, acknowledgment, deduplication
- `notification-preferences`: User+project preference model, CRUD API, default seeding, UI toggles

### Modified Capabilities
- `document-expiration-events`: Hook alert generation on `expiresAt` changes; scan endpoint for upcoming expirations
- `item-management`: Hook alert generation into `transitionStatus()` for incident/blocking/final statuses
- `event-management`: Scan endpoint generates alerts for upcoming recurring events

## Approach

**Hybrid generation**: Event-triggered alerts fire on status transitions and document changes. Scan endpoint computes time-based alerts on demand. All alerts persist with idempotent upsert.

**4 slices**: (1) Prisma + service + Zod, (2) API routes + scan + hooks, (3) Dashboard UI + bell + hooks, (4) Preferences API + UI.

## Affected Areas

| Area | Impact |
|------|--------|
| `packages/database/prisma/schema.prisma` | New models + enums |
| `packages/validation/src/alert.ts` | New Zod schemas |
| `apps/web/src/lib/services/alert-service.ts` | New generation/ack logic |
| `apps/web/src/lib/repositories/alert-repository.ts` | New data access |
| `apps/web/src/lib/services/item-service.ts` | Hook into `transitionStatus()` |
| `apps/web/src/lib/services/document-service.ts` | Hook on `expiresAt` changes |
| `apps/web/src/app/api/projects/[projectId]/alerts/` | New CRUD + scan routes |
| `apps/web/src/components/alerts/` | New bell, list, card, prefs UI |
| `apps/web/src/components/layout/sidebar.tsx` | Add Alerts nav |
| `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` | Bell in header |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prisma baseline prerequisite (ADR-005) | High | Dev with `db push`; prod needs baseline first |
| Alert duplication | Medium | Unique constraint + idempotent upsert |
| Performance on large sets | Medium | Index `expiresAt`, paginated scan, limit history |

## Rollback Plan

Remove Alert/NotificationPreference models, revert service hooks, delete routes + UI, `prisma db push` to drop tables. No existing functionality affected.

## Dependencies

- ADR-005 baseline procedure before production schema deployment

## Success Criteria

- [ ] Alerts for: document expiration (30/14/7/1 day), status changes (incident/blocking/final), upcoming maintenance
- [ ] Bell shows unread count; dashboard filters by type/severity/status
- [ ] Acknowledge/dismiss works
- [ ] Per-project notification preferences
- [ ] No duplicate alerts
- [ ] Lint, typecheck, tests pass
