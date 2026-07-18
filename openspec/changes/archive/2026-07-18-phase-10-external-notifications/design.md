# Design: Phase 10 — External Notifications

## Technical Approach

NotificationDispatcher pattern (Option A from exploration). After alert generation, a central dispatcher queries project members with matching channel preferences, formats messages via template functions per AlertType, delegates delivery to channel adapters implementing `NotificationChannel`, and logs results to `NotificationDelivery`. Dispatch is fire-and-forget (`void`) — failures never propagate to callers.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Dispatch pattern | Synchronous dispatcher (Option A) | Event-driven (B), Queue/Redis (C) | Fits existing service pattern; no new infra; testable; sufficient for 5-50 user projects |
| Channel model | Interface `NotificationChannel { send(alert, user, config): Promise<DeliveryResult> }` | Separate class per channel, function registry | Interface enables mock injection in tests; Registry resolves type→adapter |
| Template system | Pure functions per AlertType returning `{ email, slack, teams, telegram }` | Template engine (Handlebars), JSON templates | No new dependency; pure functions are trivially testable; 5 alert types = manageable |
| Channel booleans | Flat boolean columns on NotificationPreference (`email`, `slack`, `teams`, `telegram`) | JSON column, separate channel-preferences table | Boolean columns are queryable/indexable; 4 columns is not over-normalized |
| Delivery dedup | Existence check on `NotificationDelivery` (alertId + userId + channelType = "sent") before sending | Event ID, idempotency keys | Simplest; scan already upserts alerts by unique constraint |

## Data Flow

```
scan endpoint / service hooks
        │
        ▼
  generateAlert() → upsertAlert ▸▸▸▸▸▸ alerts table
        │                              (unchanged)
        ▼
  void NotificationDispatcher.dispatch(alert)
        │
        ├─► getProjectMembersWithChannelPreferences(projectId, alertType)
        │
        ├─► for each member+channel with preference enabled:
        │     ├─ dedup check: NotificationDelivery.exists(alertId, userId, channelType)
        │     ├─ formatAlertMessage(alert, project) → { email, slack, teams, telegram }
        │     └─ channel.send(alert, user, config) → DeliveryResult
        │
        └─► upsertNotificationDelivery(result) ▸▸ notification_deliveries
```

Dispatch uses `Promise.allSettled` with 10s per-channel timeout. One channel failure does not block others.

## Data Model

### Modified: NotificationPreference
Add 4 columns after `enabled`:
```prisma
email    Boolean @default(false)
slack    Boolean @default(false)
teams    Boolean @default(false)
telegram Boolean @default(false)
```
Migration: additive columns, `@default(false)` — zero data loss, opt-in only.

### New: UserChannelConfig
```prisma
model UserChannelConfig {
  id          String   @id @default(cuid())
  userId      String
  channelType String   // "slack" | "teams" | "telegram"
  config      Json     // { "webhookUrl": "..." } or { "botToken": "...", "chatId": "..." }
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, channelType])
  @@map("user_channel_configs")
}
```
Email uses `user.email` + SMTP env vars — no config entry needed.

### New: NotificationDelivery
```prisma
model NotificationDelivery {
  id          String   @id @default(cuid())
  alertId     String
  userId      String
  channelType String   // "email" | "slack" | "teams" | "telegram"
  status      String   // "sent" | "failed" | "skipped"
  errorMessage String?
  deliveredAt DateTime @default(now())
  @@index([alertId])
  @@index([userId])
  @@index([status])
  @@map("notification_deliveries")
}
```

## Service Layer

### NotificationChannel Interface
```typescript
interface NotificationChannel {
  readonly type: string;
  send(alert: Alert, user: { id: string; name?: string; email: string }, config?: JsonValue): Promise<DeliveryResult>;
}
```

### ChannelRegistry
Maps `channelType` string → `NotificationChannel` instance. Injected into dispatcher.

### NotificationDispatcher
```typescript
class NotificationDispatcher {
  constructor(channelRegistry: ChannelRegistry, deliveryRepo: DeliveryRepository);
  async dispatch(alert: Alert): Promise<void>;           // For a single alert
  async dispatchForProject(projectId: string): Promise<void>; // For scan — queries recent alerts
}
```
- `dispatchForProject`: queries alerts with `status=ACTIVE` + no delivery log → dispatches each
- Error handling: try/catch per channel call, log failure, NEVER throw
- Parallel: `Promise.allSettled` for multichannel per member

### Template Formatters
Pure functions: `formatDocumentExpiring(alert, project)`, `formatStatusIncident(...)`, etc. Each returns `{ email: {subject, html}, slack: {blocks}, teams: MessageCard, telegram: {text} }`.

### Channel Adapters
| Adapter | Transport | Key config |
|---------|-----------|------------|
| `EmailChannel` | `nodemailer.createTransport(SMTP_*)` | `user.email`, `SMTP_FROM` |
| `SlackChannel` | `fetch` POST webhookUrl | `config.webhookUrl` |
| `TeamsChannel` | `fetch` POST webhookUrl | `config.webhookUrl` |
| `TelegramChannel` | `fetch` POST `api.telegram.org/bot{token}/sendMessage` | `config.botToken`, `config.chatId` |

## API Routes

| Method | Route | Body/Params | Purpose |
|--------|-------|-------------|---------|
| GET | `/notification-channels` | — | List user's configured channels |
| GET | `/notification-channels?type=slack` | — | Get single config |
| PUT | `/notification-channels` | `{ channelType, config, enabled }` | Upsert config |
| DELETE | `/notification-channels?type=slack` | — | Remove config |
| POST | `/notification-channels/test` | `{ channelType }` | Test connectivity |
| PUT | `/alerts/preferences` | Extended: +`email`, `slack`, `teams`, `telegram` | Accept channel toggles |
| POST | `/alerts/scan` | — (modified: +`void dispatcher.dispatchForProject()`) | Scan + dispatch |

All routes enforce project membership via `getAuthUser()` + `requireProjectMember()`.

## Validation Schemas (packages/validation/src/notification.ts — NEW)

- `channelTypeEnum`: `z.enum(["slack", "teams", "telegram"])`
- `slackConfigSchema`: `{ webhookUrl: z.string().url() }`
- `teamsConfigSchema`: `{ webhookUrl: z.string().url() }`
- `telegramConfigSchema`: `{ botToken: z.string().min(1), chatId: z.string().min(1) }`
- `channelConfigSchema`: discriminated union by channelType
- `upsertChannelConfigSchema`: `{ channelType, config }` with type-specific config validation
- `testChannelSchema`: `{ channelType: channelTypeEnum }`
- Extended `updateNotificationPrefSchema`: accept optional `email`, `slack`, `teams`, `telegram` booleans

## UI Components

### Modified: `NotificationPreferences`
Add 4 toggle columns (email/slack/teams/telegram) per alert type row. Toggle is disabled with tooltip "Configure first" if no channel config exists.

### New: `ChannelConfigForm` (Client Component)
Props: `{ projectId, channelType, existingConfig }`. Fields per channel type, save button (`useMutation` PUT), test button (`useMutation` POST test), enabled toggle.

### New: `DeliveryLogTable` (Client Component)
Admin-only. Queries `GET /notification-channels/deliveries?alertId=X` showing status + error + timestamp.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Channel adapters | `send()` per adapter | Mock `fetch`/`nodemailer.createTransport`, assert payload shape, assert error → `{ success: false }` |
| Dispatcher | `dispatch()`, `dispatchForProject()` | Mock channel registry + repos, assert dedup check, assert log writes, assert that channel failure doesn't throw |
| Template formatters | Each `format*()` function | Pure function: input alert+project → assert output structure per channel |
| API routes | CRUD, test endpoint | Mock services, assert auth gating, assert response shapes |
| UI | Form interaction, toggle save | React Testing Library + MSW for API mocking |

## Threat Matrix

N/A — no routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary. Channel adapters use outbound HTTP `fetch` and `nodemailer` (npm package, no subprocess).

## File Structure

### New Files
- `packages/validation/src/notification.ts` — channel config + test schemas
- `apps/web/src/lib/services/notification-dispatcher.ts` — dispatcher
- `apps/web/src/lib/services/channels/email-channel.ts` — email adapter
- `apps/web/src/lib/services/channels/slack-channel.ts` — slack adapter
- `apps/web/src/lib/services/channels/teams-channel.ts` — teams adapter
- `apps/web/src/lib/services/channels/telegram-channel.ts` — telegram adapter
- `apps/web/src/lib/services/channel-registry.ts` — type→adapter registry
- `apps/web/src/lib/services/notification-template-service.ts` — format functions
- `apps/web/src/lib/repositories/notification-delivery-repository.ts` — delivery CRUD
- `apps/web/src/lib/repositories/channel-config-repository.ts` — channel config CRUD
- `apps/web/src/app/api/projects/[projectId]/notification-channels/route.ts` — CRUD
- `apps/web/src/app/api/projects/[projectId]/notification-channels/test/route.ts` — test
- `apps/web/src/hooks/use-notification-channels.ts` — TanStack Query hooks
- `apps/web/src/components/alerts/channel-config-form.tsx` — config UI
- `apps/web/src/components/alerts/delivery-log-table.tsx` — delivery log UI
- `apps/web/src/app/api/projects/[projectId]/notification-channels/deliveries/route.ts` — delivery log API

### Modified Files
- `packages/database/prisma/schema.prisma` — +3 models, +4 columns
- `packages/validation/src/alert.ts` — extend `updateNotificationPrefSchema`
- `packages/validation/src/index.ts` — export notification schemas
- `apps/web/src/lib/repositories/alert-repository.ts` — extend `UpdateNotificationPrefData`
- `apps/web/src/lib/services/alert-service.ts` — extend `updatePreference`, add dispatcher call
- `apps/web/src/app/api/projects/[projectId]/alerts/preferences/route.ts` — accept channel fields
- `apps/web/src/app/api/projects/[projectId]/alerts/scan/route.ts` — integrate dispatcher
- `apps/web/src/components/alerts/notification-preferences.tsx` — add channel toggle columns
- `apps/web/src/hooks/use-notification-preferences.ts` — extend `UpdatePreferenceInput`, `NotificationPreference` type

## Migration / Rollout

Single Prisma migration: add columns to `notification_preferences` (`@default(false)`), create `user_channel_configs` and `notification_deliveries` tables. Zero data loss. Rollback: drop new columns/tables, remove dispatcher hooks from services.

## Open Questions

- [ ] None — all architectural decisions resolved.
