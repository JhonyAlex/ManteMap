# Tasks: Phase 10 — External Notifications

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,700 (code) + ~550 (tests) |
| New files | 16 |
| Modified files | 9 |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Data model + validation schemas | PR 1 | `pnpm --filter validation test -- notification` | `pnpm typecheck && pnpm lint` | Revert schema changes + re-run baseline |
| 2 | Channel infrastructure + all 4 adapters + template formatters | PR 2 | `pnpm test -- --testPathPattern="(channel|template|notification-)"` | Start dev server, call test endpoint | Revert new service files + repos |
| 3 | Dispatcher + scan/service hooks + all API routes | PR 3 | `pnpm test -- --testPathPattern="(dispatcher|notification-channels|preferences.*alert)"` | `POST /alerts/scan` with project that has prefs | Revert route files + dispatcher hooks |
| 4 | UI components + hooks + preferences channel toggles | PR 4 | `pnpm test -- --testPathPattern="(channel-config|delivery-log|notification-pref)"` | Render each component in dev server | Revert component files + hooks |

## Phase 1: Foundation

- [x] **1.1** Add `email`/`slack`/`teams`/`telegram` Boolean columns to `NotificationPreference` + `UserChannelConfig` + `NotificationDelivery` models in `packages/database/prisma/schema.prisma`; generate migration (`@default(false)` additive)
- [x] **1.2** Create `packages/validation/src/notification.ts` with `channelTypeEnum`, config schemas (slack/teams/telegram), `upsertChannelConfigSchema`, `testChannelSchema`, and extended `updateNotificationPrefSchema` with optional channel booleans; export from `packages/validation/src/index.ts`
- [x] **1.3** Extend `UpdateNotificationPrefData` in `alert-repository.ts` to accept optional `email`/`slack`/`teams`/`telegram` booleans; update `upsertNotificationPreference` to persist them

## Phase 2: Channel Abstractions + Adapters

- [x] **2.1** Create `NotificationChannel` interface, `ChannelRegistry`, `ChannelConfigRepository`, and `NotificationDeliveryRepository` in `apps/web/src/lib/services/channel-registry.ts`, `repositories/channel-config-repository.ts`, `repositories/notification-delivery-repository.ts`
- [x] **2.2** Create `notification-template-service.ts` with pure `format*()` functions per AlertType (`DOCUMENT_EXPIRING`, `STATUS_INCIDENT`, `STATUS_BLOCKING`, `STATUS_FINAL`, `EVENT_UPCOMING`) returning `{ email: {subject, html}, slack: {blocks}, teams: MessageCard, telegram: {text} }`
- [x] **2.3** Implement `EmailChannel` (nodemailer SMTP, HTML body with app link, `SMTP_*` env vars)
- [x] **2.4** Implement `SlackChannel` (Block Kit via webhook POST) + `TeamsChannel` (MessageCard via webhook POST) + `TelegramChannel` (Bot API `sendMessage` with parse_mode=Markdown)

## Phase 3: Dispatcher + Integration

- [x] **3.1** Create `NotificationDispatcher` in `services/notification-dispatcher.ts`: queries members with matching prefs, dedup check on `NotificationDelivery`, delegates to channel via registry, logs result, uses `Promise.allSettled` with 10s timeout
- [x] **3.2** Wire `dispatcher.dispatchForProject(projectId)` as fire-and-forget (`void`) into `POST /alerts/scan` after scan completes; wire `dispatcher.dispatch(alert)` after `generateAlert()` calls in `item-service.ts` and `document-service.ts`

## Phase 4: API + UI

- [x] **4.1** Create notification-channels CRUD API routes (GET list, GET by type, PUT upsert, DELETE) + test endpoint (POST test) + deliveries log endpoint (GET deliveries) under `apps/web/src/app/api/projects/[projectId]/notification-channels/` and `notification-deliveries/`
- [x] **4.2** Extend `PUT /alerts/preferences` to accept optional `email`/`slack`/`teams`/`telegram` booleans alongside existing `alertType`/`enabled`
- [x] **4.3** Create `use-notification-channels` TanStack Query hook + `ChannelConfigForm` component (per-channel URL/token input, save button, test button) + `DeliveryLogTable` component (admin view)
- [x] **4.4** Add 4 channel toggle columns to `NotificationPreferences` component per alert type row; disable with tooltip when no channel config exists
