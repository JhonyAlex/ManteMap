# Proposal: Phase 10 — External Notifications

## Intent

Connect Phase 8's in-app alert system to email, Slack, Teams, and Telegram. Users enable channels per alert type from their notification preferences. No new infrastructure — SMTP env vars already exist, webhook channels use built-in `fetch`. Only `nodemailer` added (already in lockfile as `@auth/core` peer).

## Scope

### In Scope
- 4 boolean channel columns on `NotificationPreference` (`email`, `slack`, `teams`, `telegram`)
- `UserChannelConfig` model: per-user webhook URLs / bot tokens for Slack, Teams, Telegram
- `NotificationDelivery` audit log: sent/failed/skipped per alert+user+channel
- `NotificationDispatcher` service: queries members + preferences, formats messages, delegates to channels
- 4 channel adapters: Email (nodemailer), Slack (Block Kit), Teams (MessageCard), Telegram (Bot API)
- Function-based template formatters per `AlertType`
- Extended preferences API (channel toggles) + channel config CRUD + test endpoint
- Channel config UI (webhook URL form, test button) + per-alert-type channel toggle column
- Dispatcher integrated into scan endpoint + service hooks (fire-and-forget `void`)

### Out of Scope
- Queue/Redis-based delivery, digest/coalescing, rate limiting, template engine, per-user email config, push notifications

## Capabilities

### New Capabilities
- `external-notification-delivery`: NotificationDispatcher, 4 channel adapters, template formatters, NotificationDelivery audit log
- `channel-configuration`: UserChannelConfig model, per-user credential CRUD API + form UI + test connectivity

### Modified Capabilities
- `notification-preferences`: Add 4 channel booleans; API accepts channel toggles; UI shows per-channel toggle per alert type
- `alert-management`: Scan endpoint fires dispatcher after generation; service hooks dispatch for status/document alerts

## Approach

**NotificationDispatcher pattern** (Option A from exploration). Central router: after alert generation → queries project members with matching channel preferences → formats messages per AlertType via template functions → delegates to channel adapters (`interface NotificationChannel { send(alert, user, config) → DeliveryResult }`) → logs to NotificationDelivery. Dispatch is fire-and-forget (`void`) to avoid blocking scan response.

## Data Model

| Model | Change | Key Fields |
|-------|--------|------------|
| `NotificationPreference` | Extend | +`email`, `slack`, `teams`, `telegram` Boolean @default(false) |
| `UserChannelConfig` | New | `userId`, `channelType` ("slack"\|"teams"\|"telegram"), `config` Json, `enabled`; `@@unique([userId, channelType])` |
| `NotificationDelivery` | New | `alertId`, `userId`, `channelType` ("email"\|"slack"\|"teams"\|"telegram"), `status` ("sent"\|"failed"\|"skipped"), `errorMessage`; `@@index([alertId, userId, status])` |

## API Surface

| Method | Route | Purpose |
|--------|-------|---------|
| PUT | `/{projectId}/preferences` | Accepts channel booleans alongside existing fields |
| GET/PUT/DELETE | `/{projectId}/notification-channels` | Per-user channel config CRUD |
| POST | `/{projectId}/notification-channels/test` | Test a channel config (webhook/token validation) |

## UI Changes

- **NotificationPreferences**: add per-channel toggle column (email/slack/teams/telegram) per alert type row
- **ChannelConfigForm** (new): webhook URL / bot token input + test button per channel type
- **DeliveryLogTable** (new): admin-only view of recent deliveries and failures

## Risks

| Risk | Mitigation |
|------|------------|
| SMTP not configured → email silent failure | Log warning on startup; show "not configured" badge in UI |
| Webhook URL expires/changes → silent failure | Delivery log surfaces failures; test button validates config |
| Telegram bot token stored in DB | Document encryption best practice; Json config separation |
| Scan timeout with many members | `Promise.allSettled` + 10s per-channel timeout; void dispatch |
| Migration: existing prefs lack channel columns | `@default(false)` — no behavioral change, opt-in only |

## Rollback Plan

Remove channel columns from `NotificationPreference`, drop `UserChannelConfig` + `NotificationDelivery` tables, revert dispatcher hooks, delete channel service files + routes + UI. Zero impact on existing functionality.

## Dependencies

- `nodemailer` ^7.x (already in lockfile as `@auth/core` optional peer)
- SMTP env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (already in `.env.example`)
- `APP_URL` env var (already configured)

## Success Criteria

- [ ] User enables email for `DOCUMENT_EXPIRING` → receives email on scan
- [ ] User configures Slack webhook → alert appears in Slack channel
- [ ] User configures Telegram → alert appears in Telegram chat
- [ ] User configures Teams webhook → alert appears in Teams channel
- [ ] Delivery log records sent/failed/skipped per alert+user+channel
- [ ] Test button validates webhook/token connectivity per channel
- [ ] Channel toggles persist across page reloads
- [ ] No duplicate deliveries via NotificationDelivery existence check
- [ ] Migration applies cleanly with `@default(false)` — zero data loss
- [ ] Lint, typecheck, ~200+ new tests pass
