# Tasks: Phase 8 — Alerts & Notifications

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1300 (schema 50, validation 80, repo 100, service 150, hooks 30, API 200, UI 300, tests 400) |
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

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Prisma schema + Zod validation + repository + service + unit tests | PR 1 | `pnpm --filter @mantemap/database exec prisma validate && pnpm --filter @mantemap/validation test && pnpm test -- --reporter=verbose alert-service alert-repository` | `npx prisma db push` to verify schema applies | Remove Alert/NotificationPreference models + alert.ts validation + repo/service files |
| 2 | API routes + service hooks (item/document) + integration tests | PR 2 | `pnpm test -- --reporter=verbose alert.*route item-service document-service` | `curl POST /api/projects/{id}/alerts/scan` against dev DB | Delete `apps/web/src/app/api/projects/[projectId]/alerts/` + revert hooks in item/document services |
| 3 | Dashboard UI + bell + preferences UI + component tests | PR 3 | `pnpm test -- --reporter=verbose alert-bell alert-list alert-card notification-preferences` | Navigate to `/projects/{id}/alerts` in browser | Delete `apps/web/src/components/alerts/` + revert sidebar/layout changes |

## Phase 1: Foundation — Schema, Validation, Repository, Service

- [x] 1.1 RED: Write failing test for Alert model fields and unique constraint in `packages/database/prisma/schema.prisma`
- [x] 1.2 GREEN: Add `AlertType`, `AlertSeverity`, `AlertStatus` enums and `Alert` model to `schema.prisma`
- [x] 1.3 GREEN: Add `NotificationPreference` model with `@@unique([userId, projectId, alertType])` to `schema.prisma`
- [x] 1.4 REFACTOR: Run `prisma validate` — fix any schema errors
- [x] 1.5 RED: Write failing tests for `createAlertSchema`, `alertFilterSchema`, `notificationPrefSchema` in `packages/validation/src/alert.ts`
- [x] 1.6 GREEN: Create `packages/validation/src/alert.ts` with Zod schemas; export from `packages/validation/src/index.ts`
- [x] 1.7 RED: Write failing tests for `alert-repository.ts` (upsert, list with filters, acknowledge, dismiss, countUnread)
- [x] 1.8 GREEN: Create `apps/web/src/lib/repositories/alert-repository.ts`
- [x] 1.9 RED: Write failing tests for `alert-service.ts` (generateAlert with severity mapping, scanDocuments, scanEvents, ack, dismiss)
- [x] 1.10 GREEN: Create `apps/web/src/lib/services/alert-service.ts` with generation, scan, ack/dismiss logic

## Phase 2: API Routes + Service Hooks

- [x] 2.1 RED: Write failing tests for GET/POST `/api/projects/[projectId]/alerts/route.ts` (list filtered, create)
- [x] 2.2 GREEN: Create `apps/web/src/app/api/projects/[projectId]/alerts/route.ts`
- [x] 2.3 RED: Write failing tests for PATCH ack/dismiss in `[alertId]/route.ts`
- [x] 2.4 GREEN: Create `apps/web/src/app/api/projects/[projectId]/alerts/[alertId]/route.ts`
- [x] 2.5 RED: Write failing tests for POST `/alerts/scan/route.ts` (returns count)
- [x] 2.6 GREEN: Create `apps/web/src/app/api/projects/[projectId]/alerts/scan/route.ts`
- [x] 2.7 RED: Write failing test: `transitionStatus()` to incident triggers critical alert
- [x] 2.8 GREEN: Hook `alertService.generateAlert()` into `item-service.ts` `transitionStatus()` for incident/blocking/final statuses
- [x] 2.9 RED: Write failing test: `updateDocumentMetadata()` with `expiresAt` change triggers alert
- [x] 2.10 GREEN: Hook `alertService.generateAlert()` into `document-service.ts` `updateDocumentMetadata()` when `expiresAt` changes
- [x] 2.11 RED: Write failing tests for GET/PUT `/alerts/preferences/route.ts`
- [x] 2.12 GREEN: Create `apps/web/src/app/api/projects/[projectId]/alerts/preferences/route.ts`

## Phase 3: Dashboard UI + Bell + Preferences

- [x] 3.1 RED: Write failing test for `AlertBell` component (badge count, click opens dropdown)
- [x] 3.2 GREEN: Create `apps/web/src/components/alerts/alert-bell.tsx` with TanStack Query for unread count
- [x] 3.3 RED: Write failing test for `AlertCard` (severity indicator, ack/dismiss buttons)
- [x] 3.4 GREEN: Create `apps/web/src/components/alerts/alert-card.tsx`
- [x] 3.5 RED: Write failing test for `AlertList` (filter by type/severity/status, pagination)
- [x] 3.6 GREEN: Create `apps/web/src/components/alerts/alert-list.tsx`
- [x] 3.7 RED: Write failing test for `NotificationPreferences` (toggles, minSeverity dropdown)
- [x] 3.8 GREEN: Create `apps/web/src/components/alerts/notification-preferences.tsx`
- [x] 3.9 GREEN: Create `apps/web/src/app/(dashboard)/projects/[projectId]/alerts/page.tsx`
- [x] 3.10 GREEN: Add "Alerts" nav item to `apps/web/src/components/layout/sidebar.tsx`
- [x] 3.11 GREEN: Add `AlertBell` to `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` header

## Phase 4: Integration Verification

- [x] 4.1 Verify: `prisma validate` passes with new models
- [x] 4.2 Verify: `pnpm lint && pnpm typecheck` pass
- [x] 4.3 Verify: `pnpm test` — all alert-related tests pass
- [x] 4.4 Verify: Full flow — create item → transition to incident → alert appears → ack → count decrements
