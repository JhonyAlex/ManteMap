# Exploration: Phase 8 — Alerts & Notifications

## Current State

### What Exists Today

**Document Expiration** — The only proactive date-awareness mechanism in the system:

- `Document.expiresAt` (`schema.prisma:367`) — nullable DateTime with an index
- `getExpirationColor()` (`apps/web/src/lib/utils/expiration-color.ts:14`) — returns red/yellow/blue based on 30-day threshold
- `generateExpirationEvents()` (`apps/web/src/lib/services/event-service.ts:133`) — queries documents with `expiresAt` in a date range, generates virtual calendar events on-demand
- No persistent alert records — expiration awareness is purely on-demand query at calendar render time

**Event Model** (`schema.prisma:405-426`):
- Project-scoped, optional Item association
- Supports RRULE recurrence (`rrule` field)
- Used for manual maintenance events and auto-generated document expiration events
- No reminder/notification mechanism attached to events

**Item Status Transitions** (`apps/web/src/lib/services/item-service.ts:208-240`):
- `transitionStatus()` — dedicated service function with authorization checks
- Status model has `isFinal`, `isBlocking`, `isIncident` properties — natural alert triggers
- Transition is a simple UPDATE, no side effects, no audit trail, no notifications

**No Alert/Notification Infrastructure**:
- No `Alert` or `Notification` model in Prisma schema
- No notification preferences model
- No email sending capability (no Resend, Nodemailer, or similar in dependencies)
- No background job system (no cron, no BullMQ, no similar)
- No notification bell or alert dashboard UI

**ROADMAP.md Phase 8** (lines 159-169):
- Dashboard principal with KPIs, expiring items, activity
- Indicators: active/inactive items, pending docs
- CSV export
- The ROADMAP calls this "Panel e informes" (Dashboard & Reports), NOT "Alerts & Notifications"

**ROADMAP.md Phase 9** (lines 173-188):
- "Notificaciones externas" (External notifications) — Email, Teams, Slack, Telegram
- Listed as "Evaluar" (Evaluate), not committed

**Key Discrepancy**: The user's request for "Phase 8 — Alerts & Notifications" does NOT match the ROADMAP. The ROADMAP defines Phase 8 as Dashboard/Reports and Phase 9 as External Notifications. This exploration treats the user's request as authoritative and explores "Alerts & Notifications" as a new phase.

### Architecture Patterns to Follow

| Pattern | Source | Relevance |
|---------|--------|-----------|
| Service/Repository separation | `item-service.ts` / `item-repository.ts` | Alert service must follow same architecture |
| Project-scoped access | `requireProjectMember` / `requireProjectOwner` | Alerts are project-scoped |
| Zod validation in `packages/validation` | `item.ts`, `dynamic-field.ts` | Alert preferences schemas belong here |
| API routes under `/api/projects/[projectId]/` | `apps/web/src/app/api/projects/[projectId]/items/` | Alert routes follow same nesting |
| TanStack Query hooks | `use-items.ts` | Alert hooks follow same pattern |
| shadcn/ui components | Radix primitives in `apps/web` | Alert bell, notification list, preference toggles |
| Event hook points | `item-service.ts:transitionStatus()`, `event-service.ts` | Natural places to trigger alert generation |

### Alert Source Analysis

| Source | Trigger Point | Current Behavior | Alert Need |
|--------|--------------|------------------|------------|
| Document expiration | `Document.expiresAt` | On-demand calendar event generation | Persistent alerts at 30/14/7/1 day(s) before expiry |
| Maintenance due | Recurring `Event` with `rrule` | Calendar expansion via `expandRecurringEvents()` | Alerts before next occurrence |
| Status change (incident) | `transitionStatus()` | Simple UPDATE, no side effects | Alert when item enters `isIncident` status |
| Status change (blocking) | `transitionStatus()` | Simple UPDATE, no side effects | Alert when item enters `isBlocking` status |
| Status change (final) | `transitionStatus()` | Simple UPDATE, no side effects | Optional alert when item reaches `isFinal` |
| Item created | `createItem()` | Creates item + field values | Optional welcome/setup alerts for project managers |

---

## Affected Areas

### New Files (Alert Domain)

- `packages/database/prisma/schema.prisma` — Add `Alert`, `NotificationPreference`, `AlertRule` models
- `packages/validation/src/alert.ts` — Zod schemas for alert CRUD and preferences
- `apps/web/src/lib/repositories/alert-repository.ts` — Data access layer
- `apps/web/src/lib/services/alert-service.ts` — Alert generation, querying, acknowledgment
- `apps/web/src/lib/services/notification-service.ts` — Delivery abstraction (in-app, future email)
- `apps/web/src/app/api/projects/[projectId]/alerts/route.ts` — List/create alerts
- `apps/web/src/app/api/projects/[projectId]/alerts/[alertId]/route.ts` — Get/acknowledge/delete
- `apps/web/src/app/api/projects/[projectId]/alerts/preferences/route.ts` — User notification preferences
- `apps/web/src/components/alerts/alert-bell.tsx` — Notification bell with unread count
- `apps/web/src/components/alerts/alert-list.tsx` — Alert dashboard/list view
- `apps/web/src/components/alerts/alert-card.tsx` — Individual alert display
- `apps/web/src/components/alerts/notification-preferences.tsx` — Preference toggles
- `apps/web/src/hooks/use-alerts.ts` — TanStack Query hooks
- `apps/web/src/app/(dashboard)/projects/[projectId]/alerts/page.tsx` — Alert dashboard page

### Modified Files

- `packages/database/prisma/schema.prisma` — New models + relations to existing models
- `packages/validation/src/index.ts` — Export alert schemas
- `apps/web/src/lib/services/item-service.ts` — Hook alert generation into `transitionStatus()`
- `apps/web/src/lib/services/event-service.ts` — Hook alert generation into `generateExpirationEvents()` or add separate alert generation
- `apps/web/src/lib/services/document-service.ts` — Hook alert generation on document create/update with `expiresAt`
- `apps/web/src/components/layout/sidebar.tsx` — Add Alerts nav item
- `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` — Add alert bell to header

---

## Approaches

### 1. On-Demand Alert Computation (Lazy)

Compute all alerts when the user loads the alert dashboard or notification bell. No persistent alert records — query sources (documents, events, statuses) in real-time.

**Pros:**
- Simplest infrastructure — no background jobs, no cron
- Always fresh data — no staleness between runs
- No additional database storage for alert records
- Easiest to implement and test

**Cons:**
- Slow page loads if many documents/events to check
- Cannot send email notifications (no trigger point)
- No audit trail of when alerts were generated/acknowledged
- Users must actively check the app — no proactive push
- Repeated computation for the same alerts on every page load

**Effort: Low**

### 2. Persistent Alert Records with On-Demand Generation (Eager, No Background)

Generate alert records when trigger events occur (document create/update, status transition, etc.). Store them in an `Alert` table. Query the table for display.

**Pros:**
- Fast dashboard loads (pre-computed alerts)
- Acknowledgment/dismissal tracking
- Audit trail of alert history
- Foundation for future email notifications
- Alerts persist across sessions

**Cons:**
- No proactive generation for time-based alerts (document expiry, maintenance due) — those still need a trigger
- Document expiration alerts only fire when document is created/updated, not as time passes
- May miss alerts if the trigger event doesn't happen (e.g., document created 60 days ago, expires in 5 days — no new trigger)

**Effort: Medium**

### 3. Persistent Alerts + Scheduled Scanner (Eager, Background)

Same as Approach 2, plus a scheduled job (cron or Vercel Cron) that scans for time-based alerts (expiring documents, upcoming maintenance) and generates alert records.

**Pros:**
- Complete coverage — both event-triggered and time-based alerts
- Fast dashboard loads
- Foundation for email notifications
- Full audit trail
- Proactive alert generation

**Cons:**
- Requires background job infrastructure (Vercel Cron, or custom scheduler)
- More complex to test (cron jobs, timing)
- Potential for duplicate alerts if scanner runs while trigger also fires
- Vercel Cron has execution time limits (10s on hobby plan)
- More infrastructure to maintain

**Effort: High**

### 4. Hybrid: Event-Triggered + Manual Scan Endpoint (Recommended)

Generate alerts on trigger events (document create/update, status transition). For time-based alerts (expiry, maintenance), expose a scan endpoint that the client calls periodically or on page load. Store results as persistent alert records.

**Pros:**
- Event-triggered alerts are immediate (status changes, document uploads)
- Time-based alerts are computed on-demand but cached as persistent records
- No background job infrastructure needed
- Fast subsequent loads (alerts already computed and stored)
- Foundation for email (call scan endpoint from future cron)
- Acknowledgment/dismissal tracking
- Full audit trail

**Cons:**
- First load after time passes may be slightly slower (scan runs)
- Need idempotent alert generation (don't duplicate existing alerts)
- Slightly more complex than pure on-demand

**Effort: Medium**

---

## Notification Delivery Approaches

### A. In-App Only (Recommended for Phase 8)

Notification bell with unread count, alert dashboard page, mark-as-read functionality.

**Pros:**
- No external dependencies
- Simple implementation
- Works offline
- No deliverability concerns

**Cons:**
- Users must check the app
- No proactive push

**Effort: Low**

### B. In-App + Email Foundation

Add email sending infrastructure (e.g., Resend, Nodemailer) with a `NotificationPreference` model that controls which alerts send emails.

**Pros:**
- Proactive notifications
- Users don't miss critical alerts
- Foundation for future integrations (Teams, Slack)

**Cons:**
- Email infrastructure setup (API keys, templates, deliverability)
- More complex preference model
- Testing email delivery is harder
- Cost (email service provider)

**Effort: Medium-High**

---

## Preference Storage Approaches

### A. User-Level Preferences (Simple)

Global preferences per user: "I want email for document expiration, in-app for status changes."

```prisma
model NotificationPreference {
  id        String   @id @default(cuid())
  userId    String
  alertType String   // DOCUMENT_EXPIRATION, STATUS_CHANGE, MAINTENANCE_DUE
  channel   String   // IN_APP, EMAIL
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, alertType, channel])
  @@map("notification_preferences")
}
```

**Pros:**
- Simple schema
- Easy to query
- Works for single-project users

**Cons:**
- No project-specific control (user may want alerts for Project A but not Project B)
- One-size-fits-all across all projects

**Effort: Low**

### B. User + Project Preferences (Granular)

Preferences scoped to user + project: "For Project X, I want email for document expiration."

```prisma
model NotificationPreference {
  id        String   @id @default(cuid())
  userId    String
  projectId String?
  alertType String
  channel   String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId, alertType, channel])
  @@map("notification_preferences")
}
```

**Pros:**
- Granular control per project
- `projectId = null` acts as global default
- Users can customize per project

**Cons:**
- More complex query logic (check project-specific, fallback to global)
- Slightly more complex UI

**Effort: Medium**

---

## Recommended Prisma Schema

```prisma
// -------------------------------------------
// Alerts & Notifications
// -------------------------------------------

enum AlertType {
  DOCUMENT_EXPIRATION
  MAINTENANCE_DUE
  STATUS_CHANGE_INCIDENT
  STATUS_CHANGE_BLOCKING
  STATUS_CHANGE_FINAL
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AlertStatus {
  UNREAD
  READ
  ACKNOWLEDGED
  DISMISSED
}

model Alert {
  id          String        @id @default(cuid())
  projectId   String
  itemId      String?
  documentId  String?
  eventId     String?
  type        AlertType
  severity    AlertSeverity @default(INFO)
  status      AlertStatus   @default(UNREAD)
  title       String
  message     String?
  metadata    Json?         // Extra context (old status, new status, days until expiry, etc.)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  item     Item?   @relation(fields: [itemId], references: [id], onDelete: SetNull)
  document Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)
  event    Event?  @relation(fields: [eventId], references: [id], onDelete: SetNull)

  @@index([projectId, status])
  @@index([projectId, type])
  @@index([projectId, createdAt])
  @@index([itemId])
  @@index([documentId])
  @@map("alerts")
}

model NotificationPreference {
  id        String   @id @default(cuid())
  userId    String
  projectId String?
  alertType AlertType
  channel   String   // IN_APP, EMAIL (future)
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId, alertType, channel])
  @@map("notification_preferences")
}
```

---

## Recommended Architecture Slices

### Slice 1: Alert Model + Generation Service
- Prisma schema (Alert, NotificationPreference models)
- Alert repository (CRUD, queries)
- Alert service (generation logic for each source)
- Zod validation schemas
- Unit tests

### Slice 2: Alert API + Acknowledgment
- API routes (list, get, acknowledge, dismiss)
- Scan endpoint for time-based alerts
- Integration with item-service `transitionStatus()` hook
- Integration with document-service for expiration alerts
- Tests

### Slice 3: Alert Dashboard UI
- Alert list page with filters (type, severity, status)
- Alert card component
- Alert bell with unread count (header)
- Mark-as-read / dismiss interactions
- TanStack Query hooks
- Tests

### Slice 4: Notification Preferences
- Preference CRUD API
- Preference UI (toggles per alert type, per project)
- Default preferences for new users/projects
- Tests

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Prisma baseline prerequisite** | Schema changes require the documented production baseline procedure (ADR-005) before deployment | Document as a hard prerequisite; dev can proceed with `prisma db push` locally |
| **Alert duplication** | Scanner + event trigger could create duplicate alerts | Use idempotency keys (type + sourceId + date window) to prevent duplicates |
| **Performance on large datasets** | Scanning all documents/events for a project with thousands of items | Index on `expiresAt`, `status`, paginate scan results, limit alert history |
| **ROADMAP misalignment** | User's "Phase 8 — Alerts" doesn't match ROADMAP Phase 8 (Dashboard) | Proceed with user's request; update ROADMAP after exploration is approved |
| **No email infrastructure** | Email notifications deferred to Phase 9 per ROADMAP | Design preference model to support EMAIL channel but don't implement sending in Phase 8 |
| **Timezone handling** | Alert timestamps and expiration checks must be timezone-aware | Store all dates in UTC (existing pattern), display in user timezone |
| **Windows build symlink issue** | Known standalone build EPERM on Windows | Existing known issue; not introduced by this phase |

---

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should:

1. **Clarify ROADMAP alignment** — The user's "Phase 8 — Alerts & Notifications" differs from ROADMAP Phase 8 (Dashboard/Reports). Propose updating ROADMAP or clarifying scope.
2. **Confirm alert generation approach** — Recommend Hybrid (Approach 4): event-triggered + scan endpoint, no background jobs.
3. **Confirm delivery scope** — Recommend in-app only for Phase 8, email foundation deferred.
4. **Confirm preference model** — Recommend user + project preferences (Approach B) for granularity.
5. **Proceed to proposal** with clear scope: Alert model, generation service, API, dashboard UI, preferences — split into 4 slices.

**Key decisions needed**:
- Alert generation: Hybrid (recommendation) vs. pure on-demand vs. background cron
- Email: Defer to Phase 9 (recommendation) vs. include basic email in Phase 8
- Preferences: User+Project (recommendation) vs. user-only
- ROADMAP update: Rename Phase 8 to "Alerts & Notifications" and move Dashboard to Phase 9, or keep separate
