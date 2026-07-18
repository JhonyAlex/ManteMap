# Exploration: Phase 10 — External Notifications

## Current Architecture Analysis

### Data Model

**Alert** (`schema.prisma:428-450`):
- Project-scoped, no direct user FK — alerts live at the project level
- Unique constraint `(sourceType, sourceId, alertType)` enforces idempotency (upsert)
- `sourceType`/`sourceId` are string-based polymorphic references (no real FK)
- `metadata` JSON blob holds context (days until expiry, status name, etc.)
- No `userId` field — alerts are global to the project, NOT per-user

**NotificationPreference** (`schema.prisma:452-466`):
- Per user + per project + per alertType — `@@unique([userId, projectId, alertType])`
- Only stores `enabled: boolean` — NO channel configuration
- A single `true`/`false` per alert type. No way to say "email me incidents but only in-app for events"

**User** (`schema.prisma:20-40`):
- Has `email` (String, unique) — the delivery target for email
- Has `name` (String?) — useful for personalization
- Has `role` (UserRole) — could inform escalation routing
- `emailVerified` (DateTime?) — present but not used for notification consent

### Key Architectural Gap

The NotificationPreference model controls **IF** an alert fires for a user, but not **HOW** it's delivered. There is no channel concept anywhere — no per-channel enablement, no channel credentials, no delivery status tracking.

### Alert Generation Flow

```
Event Hook (item transition / doc update)   Scan Endpoint (POST /alerts/scan)
        │                                            │
        ▼                                            ▼
  generateAlert() ──────────────────► upsertAlert (Prisma)
        │
        ▼
  alerts table (project-scoped, no userId)
        │
        ▼
  In-app display only (AlertBell GET /alerts?action=unread-count)
```

The flow today:
1. **Event hooks**: `item-service.transitionStatus()` and `document-service.updateDocumentMetadata()` call `generateAlert()` as fire-and-forget (`void`).
2. **Scan endpoint**: `POST /alerts/scan` runs `scanDocumentExpirations()` + `scanUpcomingEvents()` — both loop over sources and call `upsertAlert()`.
3. **Display**: `AlertBell` calls GET `/alerts?action=unread-count` for badge. `AlertList` queries filtered alerts.

### How Users Relate to Alerts

Alerts are **project-scoped, not user-scoped**. There's no direct user-alert relationship. All project members see the same alerts. The current `NotificationPreference` model determines which alert types a user sees in-app, but there's no delivery mechanism.

For external notifications, we need to:
- Know **which users** should receive a notification for a given alert
- Know **which channels** each user has enabled (email, slack, teams, telegram)
- Have the **credentials** for each channel per user

---

## Affected Areas

### New Files (Notification Domain)
- `packages/database/prisma/schema.prisma` — Add `NotificationChannel`, `NotificationDelivery` models
- `packages/validation/src/notification.ts` — Zod schemas for channel preferences and delivery config
- `apps/web/src/lib/services/notification-dispatcher.ts` — Central dispatcher routing alerts to channels
- `apps/web/src/lib/services/channels/email-channel.ts` — Email delivery via nodemailer
- `apps/web/src/lib/services/channels/slack-channel.ts` — Slack webhook delivery
- `apps/web/src/lib/services/channels/teams-channel.ts` — Teams webhook delivery
- `apps/web/src/lib/services/channels/telegram-channel.ts` — Telegram bot delivery
- `apps/web/src/lib/services/channel-registry.ts` — Registry of available delivery channels
- `apps/web/src/lib/services/notification-template-service.ts` — Template rendering per alert type
- `apps/web/src/app/api/projects/[projectId]/notification-channels/route.ts` — Channel config CRUD
- `apps/web/src/hooks/use-notification-channels.ts` — TanStack Query hooks

### Modified Files
- `packages/database/prisma/schema.prisma` — New models + extended NotificationPreference
- `packages/validation/src/index.ts` — Export new schemas
- `packages/validation/src/alert.ts` — Add channel fields to preference schemas
- `apps/web/src/lib/services/alert-service.ts` — Add notification dispatch after scan/generation
- `apps/web/src/lib/repositories/alert-repository.ts` — Add channel preference queries
- `apps/web/src/app/api/projects/[projectId]/alerts/scan/route.ts` — Integrate dispatcher
- `.env.example` — Add channel env vars
- `apps/web/src/lib/services/item-service.ts` — If direct dispatch desired (vs scan-based)
- `apps/web/src/lib/services/document-service.ts` — Same

---

## Architecture Approaches

### Option A: NotificationDispatcher Pattern (Recommended)

A central `NotificationDispatcher` service that, after an alert is generated:
1. Queries project members with matching preferences for that alert type
2. For each member-channel combination, formats the message and sends

```
Alert Generated (via hook or scan)
        │
        ▼
NotificationDispatcher.dispatch(alert)
        │
        ├──► Query: members + preferences where channel enabled
        │
        ├──► For each member:
        │     ├── email ───► EmailChannel.send(member, alert)
        │     ├── slack ───► SlackChannel.send(member, alert)
        │     ├── teams ───► TeamsChannel.send(member, alert)
        │     └── telegram ► TelegramChannel.send(member, alert)
        │
        └──► Log delivery results to NotificationDelivery table
```

**Pros:**
- Simple, synchronous, easy to understand and test
- Follows existing service/repository pattern exactly
- No new infrastructure (no queues, no event bus)
- Central error handling and retry logic
- Works immediately with the scan endpoint
- Easy to add new channels (just implement a `Channel` interface)

**Cons:**
- Synchronous dispatch blocks the scan endpoint — creates latency if many users/channels
- No retry mechanism if a channel is temporarily down (unless we add in-memory retry)
- Scan endpoint could time out with many members (Next.js has 15s/60s/300s limits depending on plan)

**Effort: Medium**

### Option B: Event-Driven (emit + handlers)

After alert generation, emit a typed event. Channel handlers subscribe and deliver independently.

```
Alert Generated
        │
        ▼
EventEmitter.emit('alert.created', alert)
        │
        ├──► EmailHandler.on('alert.created', ...)
        ├──► SlackHandler.on('alert.created', ...)
        └──► ...
```

**Pros:**
- Decoupled — adding a channel is just adding a handler
- Easy to test handlers in isolation
- Can add async behavior without a queue

**Cons:**
- Node.js EventEmitter is in-process — if handler throws, caller's try/catch is still needed
- No persistence — if process crashes mid-dispatch, notifications are lost
- Still synchronous within the same tick unless handlers are explicitly made async
- Adds indirection without solving the real problems (persistence, reliability)

**Effort: Medium-Low** (EventEmitter is built-in)

### Option C: Queue-Based (BullMQ / Redis)

Enqueue notification jobs after alert generation. Workers process them asynchronously.

```
Alert Generated
        │
        ▼
Queue.enqueue({ type: 'notify', alertId, members, channels })
        │
        ▼
Worker (background process)
        │
        ├──► Channel 1
        ├──► Channel 2
        └──► ...
```

**Pros:**
- Reliable delivery — job stays in Redis until processed
- Retry with backoff built-in
- Can parallelize across workers
- Scan endpoint returns immediately
- Observability through queue dashboard

**Cons:**
- Requires Redis infrastructure (currently not in the stack)
- Requires BullMQ dependency (~250KB)
- Adds operational complexity (Redis management, worker process)
- Over-engineered for Phase 10 — notifications are not mission-critical (yet)
- Redis would need Docker Compose update, CI changes, etc.

**Effort: High**

### Recommendation: Option A — NotificationDispatcher

Phase 10 should use the **NotificationDispatcher pattern** with a synchronous dispatch loop. Rationale:

1. **Fits the existing architecture** — service/repository/API pattern is well-established
2. **No new infrastructure** — no Redis, no queues, no event bus
3. **Simple to test** — inject mock channels, assert calls
4. **Minimal new dependencies** — channels use HTTP POST (built-in) or nodemailer (lightweight)
5. **Good enough for Phase 10** — project member counts are small (typical: 5-50 users)
6. **Easy to upgrade later** — wrapping the dispatcher in a queue worker later is straightforward

If scan endpoint latency becomes a concern, we can later wrap the dispatcher call in a `Promise.allSettled()` with a timeout (no queue needed for basic parallelism).

---

## Data Model Changes

### Extended NotificationPreference

```prisma
model NotificationPreference {
  id              String                  @id @default(cuid())
  userId          String
  projectId       String
  alertType       AlertType
  enabled         Boolean                 @default(true)
  email           Boolean                 @default(false)
  slack           Boolean                 @default(false)
  teams           Boolean                 @default(false)
  telegram        Boolean                 @default(false)
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  user            User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project         Project                 @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId, alertType])
  @@map("notification_preferences")
}
```

The `email`/`slack`/`teams`/`telegram` boolean columns are individual channel toggles per alert type. This avoids a JSON column (harder to query/index) and avoids a separate channel preferences table (over-normalized for 4 channels).

Migration strategy: **Add columns with `@default(false)`**, so existing rows get `false` for all channels — meaning no migration data loss, no behavioral change. Users must opt in per channel.

### New: UserChannelConfig (per-user credentials)

```prisma
model UserChannelConfig {
  id            String   @id @default(cuid())
  userId        String
  channelType   String   // "slack" | "teams" | "telegram"
  config        Json     // {"webhookUrl": "..."} or {"botToken": "...", "chatId": "..."}
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, channelType])
  @@map("user_channel_configs")
}
```

Separate model because:
- Different channels need different credentials (Slack needs webhook URL, Telegram needs bot token + chat ID, Teams needs webhook URL)
- Credentials are per-user, not per-alert-type
- JSON config keeps it flexible without a table per channel type
- Users can have 0..1 config per channel type (Slack, Teams, Telegram)

**Email does NOT need a config entry** — the user's `email` field on the `User` model is the target address. SMTP server/host/port are environment-wide settings.

### New: NotificationDelivery (delivery log)

```prisma
model NotificationDelivery {
  id              String   @id @default(cuid())
  alertId         String
  userId          String
  channelType     String   // "email" | "slack" | "teams" | "telegram"
  status          String   // "sent" | "failed" | "skipped"
  errorMessage    String?
  deliveredAt     DateTime @default(now())

  @@index([alertId])
  @@index([userId])
  @@index([status])
  @@map("notification_deliveries")
}
```

This log is important for:
- Auditing which notifications were sent
- Debugging failures (channel down, invalid webhook, etc.)
- Future retry logic
- The alerts dashboard can show delivery status

---

## Channel Implementation Plan

### Interface

```typescript
interface NotificationChannel {
  readonly type: string; // "email" | "slack" | "teams" | "telegram"
  send(alert: Alert, user: { id: string; name?: string; email: string }, config?: JsonValue): Promise<DeliveryResult>;
}

interface DeliveryResult {
  success: boolean;
  error?: string;
}
```

### Email (SMTP via nodemailer)

**Approach**: Nodemailer with SMTP. Already an optional peer of `@auth/core` (next-auth), no new transitive deps at the lockfile level. Lightweight, battle-tested.

**No SendGrid/Resend/SES dependency** because:
- SMTP is universal — works with any provider (SendGrid, SES, Mailgun, self-hosted) via env vars
- Zero additional npm packages beyond nodemailer (`nodemailer` is already in lockfile)
- Configuration is in env vars (already has SMTP_* in `.env.example`)

**Implementation**:
- `EmailChannel` → creates a nodemailer `transporter` from `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Sends to `user.email`
- HTML body rendered from templates (simple string interpolation, no template engine needed for Phase 10)

**Template example**:
```
Subject: [ManteMap] {alert.title}
Body:
  Project: {project.name}
  Type: {alert.alertType}
  Severity: {alert.severity}
  {alert.message}
  View: {appUrl}/projects/{project.id}/alerts
```

### Slack (Incoming Webhook)

**Approach**: HTTP POST to Slack Incoming Webhook URL with JSON body. Uses Node.js built-in `fetch`/`https` — zero additional npm packages.

**Payload format** (Slack Block Kit):
```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🚨 {alert.title}" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Project:*\n{project.name}" },
        { "type": "mrkdwn", "text": "*Severity:*\n{alert.severity}" }
      ]
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "{alert.message}" }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View in ManteMap" },
          "url": "{appUrl}/projects/{project.id}/alerts"
        }
      ]
    }
  ]
}
```

**User config**: `{ "webhookUrl": "https://hooks.slack.com/services/..." }`

### Microsoft Teams (Incoming Webhook / Adaptive Cards)

**Approach**: HTTP POST to Teams webhook connector URL. Uses Node.js built-in `fetch`. Zero additional npm packages.

**Payload format** (MessageCard — simpler than Adaptive Cards):
```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "{severityColor}",
  "title": "{alert.title}",
  "text": "{alert.message}",
  "sections": [
    {
      "facts": [
        { "name": "Project", "value": "{project.name}" },
        { "name": "Type", "value": "{alert.alertType}" },
        { "name": "Severity", "value": "{alert.severity}" }
      ]
    }
  ],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "View in ManteMap",
      "targets": [{ "os": "default", "uri": "{appUrl}/projects/{project.id}/alerts" }]
    }
  ]
}
```

**User config**: `{ "webhookUrl": "https://{tenant}.webhook.office.com/..." }`

### Telegram (Bot API)

**Approach**: HTTP POST to `https://api.telegram.org/bot{token}/sendMessage`. Uses Node.js built-in `fetch`. Zero additional npm packages.

**Format**: Simple Markdown text message.

**User config**: `{ "botToken": "123456:ABC-DEF...", "chatId": "123456789" }`

Note: The bot token is **per-user config** because each user creates their own Telegram bot (or uses a shared one). For simplicity, Phase 10 supports per-user bot tokens, but the architecture allows a global bot token (stored in env) with per-user chat IDs.

---

## Dependency Analysis

### New npm Packages

| Package | Version | Size | Reason |
|---------|---------|------|--------|
| `nodemailer` | ^7.0.7 | ~80KB | SMTP email delivery. Already in lockfile as optional peer of `@auth/core`. Adds ZERO new transitive deps. |

All other channels use Node.js built-in `fetch` (available since Node 18, and Next.js 15 uses Node 20+). **No other packages needed.**

### Infrastructure Changes

| Component | Required? | Reason |
|-----------|-----------|--------|
| Redis | No | Queue-based approach rejected |
| BullMQ | No | Would need Redis |
| SMTP Server | Yes (env config) | SMTP_HOST/SMTP_PORT — user provides their own SMTP or relay |
| Webhook URLs | No | User-provided per channel config (stored in DB) |

### Environment Variables

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| `SMTP_HOST` | For email | *from .env.example* | nodemailer transporter |
| `SMTP_PORT` | For email | `587` | nodemailer transporter |
| `SMTP_USER` | For email | *from .env.example* | nodemailer auth |
| `SMTP_PASSWORD` | For email | *from .env.example* | nodemailer auth |
| `SMTP_FROM` | For email | `noreply@mantemap.local` | From address |
| `APP_URL` | Yes | *from .env.example* | Link generation in all channel messages |

All SMTP variables **already exist** in `.env.example`. No new env vars needed beyond what's already documented.

---

## Integration Surface

### Template System

Phase 10 does NOT need a template engine (Handlebars, Liquid, etc.). Use simple template functions per alert type:

```typescript
// Simple function per alert type — no template engine needed
function formatDocumentExpiring(alert: Alert, project: Project): ChannelMessages {
  return {
    email: {
      subject: `[ManteMap] ${alert.title}`,
      html: `<p>${alert.message}</p><p><a href="${APP_URL}/projects/${project.id}/alerts">View in ManteMap</a></p>`,
    },
    slack: { blocks: [...SlackBlockKit(alert, project)] },
    teams: { ...MessageCard(alert, project) },
    telegram: { text: `${alert.title}\n\n${alert.message}\n\n${APP_URL}/projects/${project.id}/alerts` },
  };
}
```

Each alert type (`DOCUMENT_EXPIRING`, `STATUS_INCIDENT`, etc.) gets a formatter. The `NotificationDispatcher` calls the formatter for the alert's type, then routes the formatted message to each enabled channel.

### Rate Limiting / Batching

Phase 10: **No rate limiting**. For v1, send immediately. Rationale:
- Typical project has 5-50 members
- Alert bursts are rare (status transitions are manual, scans happen on demand)
- Slack/Teams/Telegram API rate limits are generous (Slack: 1 msg/sec per webhook is fine for this scale)
- Email: nodemailer handles SMTP connection pooling

Future phases can add:
- Coalescing: "5 documents expired in Project X" instead of 5 separate messages
- Digest: daily/weekly summary of all alerts
- Rate limiting: in-memory token bucket per channel

### Dispatcher Integration with Scan Endpoint

The scan endpoint (`POST /alerts/scan`) is the natural trigger point:

```typescript
// In scan/route.ts
const [documentAlerts, eventAlerts] = await Promise.all([
  scanDocumentExpirations(projectId),
  scanUpcomingEvents(projectId),
]);

// NEW: After scan, dispatch notifications for generated alerts
if (total > 0) {
  // Dispatch is async — we fire-and-forget to avoid blocking the response
  // In a future phase, this can be moved to a queue worker
  void notificationDispatcher.dispatchForProject(projectId);
}
```

The dispatcher queries alerts created/updated in the last N seconds, finds project members with matching channel preferences, and sends.

For event hooks (`transitionStatus()`, `updateDocumentMetadata()`), the same pattern applies — call `generateAlert()`, then `notificationDispatcher.dispatchForAlert()`.

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **SMTP credentials not configured** | Email silently fails | Medium | Log warning on startup if SMTP not configured; expose health check; mark email as "not configured" in UI |
| **Webhook URL expires/changes** | Slack/Teams/Telegram silently fail | Medium | Delivery log shows failures; add "Test" button in channel config UI |
| **Telegram bot token security** | Token in DB could be exposed | Medium | Encrypt config JSON at rest (PostgreSQL pgcrypto or app-level encryption); document security best practices |
| **Scan endpoint timeout with many members** | HTTP 504 Gateway Timeout | Low | Sync dispatch with `Promise.allSettled()` + 10s timeout per channel; return response immediately and continue delivery |
| **Alert duplicates after dispatch** | User receives duplicate notifications | Low | Dedup via `NotificationDelivery` — check if already sent for same alert+user+channel within a time window |
| **Existing NotificationPreference migration** | Existing rows lack channel columns | Low | Add columns with `@default(false)` — no data loss, no behavioral change |
| **Windows build EPERM** | Known pre-existing issue | Known | Not introduced by this phase |

---

## Recommendation for Proposal Phase

**Ready for Proposal: Yes**

### Summary Recommendation

1. **Architecture**: NotificationDispatcher pattern (Option A) — central service routing alerts to channels via interface-based channels. Follows existing service pattern, minimal new deps.

2. **Data Model**: 
   - Extend `NotificationPreference` with `email`, `slack`, `teams`, `telegram` boolean columns
   - New `UserChannelConfig` model for per-user credentials (slack/teams/telegram)
   - New `NotificationDelivery` model for audit log

3. **Channel Priority**: Email first (SMTP already configured in env), then Slack, Teams, Telegram — in order of implementation complexity

4. **Channel Dependencies**: Only `nodemailer` (already in lockfile). All other channels use built-in `fetch`. Zero new infrastructure.

5. **Template System**: Simple function-based formatters per alert type (no template engine)

6. **Delivery Trigger**: After alert generation (hooks + scan), fire-and-forget dispatch. No queue/event bus for v1.

7. **TDD Adoption**: Strict TDD as per project convention. Channel implementations with mocked HTTP, dispatcher with mocked channels.

### Suggested Work Units (for tasks phase)

| Unit | Focus | Likely Scope |
|------|-------|-------------|
| 1 | Data model: schema changes + migration + validation schemas | ~100 lines |
| 2 | Channel abstractions: `NotificationChannel` interface + registry + template formatters | ~200 lines |
| 3 | Email channel: nodemailer integration + tests | ~150 lines |
| 4 | Slack channel: webhook HTTP POST + Block Kit formatting + tests | ~150 lines |
| 5 | Teams channel: webhook HTTP POST + MessageCard formatting + tests | ~150 lines |
| 6 | Telegram channel: Bot API HTTP POST + tests | ~150 lines |
| 7 | Dispatcher: `NotificationDispatcher` service + scan endpoint integration + tests | ~200 lines |
| 8 | Channel config UI: preferences page (toggle per channel per alert type) + channel config form | ~300 lines |
| 9 | Integration: delivery log, error handling, health check | ~150 lines |

Total estimated new code: ~1,400 lines (with ~50% in tests)
