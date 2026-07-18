# Design: Phase 8 — Alerts & Notifications

## Technical Approach

Hybrid alert generation: event-triggered hooks fire on status transitions and document metadata changes; a scan endpoint computes time-based alerts (expirations, upcoming events) on demand. All alerts persist via idempotent upsert keyed on `(sourceType, sourceId, alertType)`. Follows existing service-repository-API layering.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Alert generation model | Hybrid: event hooks + scan endpoint | Pure event-driven (miss time-based), pure polling (wasteful) | Covers both instant status changes and scheduled expirations without background jobs |
| Deduplication | DB unique constraint `(sourceType, sourceId, alertType)` + Prisma `upsert` | Application-level dedup, soft-delete+recreate | DB constraint is the source of truth; upsert is idempotent and safe for concurrent calls |
| Preference storage | Separate `NotificationPreference` model with per-user-per-project rows | JSON config on Project, global User prefs | Per-project granularity required; follows existing `ProjectMember` pattern |
| Alert dismissal | `dismissedAt` nullable timestamp on Alert | Separate DismissedAlert table, soft-delete | Simpler; keeps all alerts in one table; count query stays simple |
| Scan trigger | Manual API endpoint `/alerts/scan` | Cron job, Next.js middleware | Matches proposal scope (no background jobs); cron is Phase 9 |

## Data Flow

```
Status Transition / Doc Update
       │
       ▼
  Service Hook ──→ alertService.generateAlert()
       │                │
       │                ▼
       │         Prisma upsert (dedup)
       │                │
       ▼                ▼
  Original DB     alerts table
  Operation

GET /alerts/scan
       │
       ▼
  Scan Service ──→ Query docs.expiresAt (30/14/7/1d window)
       │           Query events.startAt (upcoming)
       │                │
       ▼                ▼
  Prisma upsert   alerts table
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Add `Alert`, `NotificationPreference` models + enums |
| `packages/validation/src/alert.ts` | Create | Zod schemas: `createAlertSchema`, `alertFilterSchema`, `notificationPrefSchema` |
| `packages/validation/src/index.ts` | Modify | Export new alert schemas |
| `apps/web/src/lib/repositories/alert-repository.ts` | Create | Data access: upsert, list, acknowledge, dismiss, count unread |
| `apps/web/src/lib/services/alert-service.ts` | Create | Generation logic, scan logic, ack/dismiss, preference checks |
| `apps/web/src/lib/services/item-service.ts` | Modify | Hook `generateAlert()` after `transitionStatus()` for incident/blocking/final |
| `apps/web/src/lib/services/document-service.ts` | Modify | Hook `generateAlert()` after `updateDocumentMetadata()` when `expiresAt` changes |
| `apps/web/src/app/api/projects/[projectId]/alerts/route.ts` | Create | GET list (paginated, filtered) + POST manual alert |
| `apps/web/src/app/api/projects/[projectId]/alerts/[alertId]/route.ts` | Create | PATCH ack/dismiss |
| `apps/web/src/app/api/projects/[projectId]/alerts/scan/route.ts` | Create | POST trigger scan |
| `apps/web/src/app/api/projects/[projectId]/alerts/preferences/route.ts` | Create | GET/PUT notification preferences |
| `apps/web/src/components/alerts/alert-bell.tsx` | Create | Header bell icon with unread badge (TanStack Query) |
| `apps/web/src/components/alerts/alert-list.tsx` | Create | Filterable alert list with severity indicators |
| `apps/web/src/components/alerts/alert-card.tsx` | Create | Individual alert with ack/dismiss actions |
| `apps/web/src/components/alerts/notification-preferences.tsx` | Create | Per-project toggle UI |
| `apps/web/src/components/layout/sidebar.tsx` | Modify | Add "Alerts" nav item |
| `apps/web/src/app/(dashboard)/projects/[projectId]/alerts/page.tsx` | Create | Alerts dashboard page |
| `apps/web/src/app/(dashboard)/projects/[projectId]/layout.tsx` | Modify | Add AlertBell to header |

## Interfaces / Contracts

```typescript
// Prisma enums
enum AlertType {
  DOCUMENT_EXPIRING    // doc.expiresAt approaching
  STATUS_INCIDENT      // item moved to isIncident status
  STATUS_BLOCKING      // item moved to isBlocking status
  STATUS_FINAL         // item moved to isFinal status
  EVENT_UPCOMING       // event.startAt approaching
}

enum AlertSeverity {
  CRITICAL  // expired docs, incidents
  WARNING   // blocking, 7-day expirations
  INFO      // upcoming events, 30-day heads-up
}

enum AlertStatus {
  ACTIVE
  ACKNOWLEDGED
  DISMISSED
}

// Prisma models
model Alert {
  id           String      @id @default(cuid())
  projectId    String
  alertType    AlertType
  severity     AlertSeverity
  status       AlertStatus @default(ACTIVE)
  sourceType   String      // "document" | "item" | "event"
  sourceId     String      // FK to source entity
  title        String
  message      String?
  metadata     Json?       // extra context (days until expiry, etc.)
  acknowledgedAt DateTime?
  dismissedAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([sourceType, sourceId, alertType])
  @@index([projectId, status, severity])
  @@index([projectId, createdAt])
  @@map("alerts")
}

model NotificationPreference {
  id          String   @id @default(cuid())
  userId      String
  projectId   String
  alertType   AlertType
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId, alertType])
  @@map("notification_preferences")
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `alert-service` generation logic, dedup, severity mapping, scan windowing | Vitest + Prisma mock |
| Unit | Zod schemas for alert filters, preferences | Vitest |
| Integration | API routes (list, ack, dismiss, scan), hooks in item/document services | Vitest + Prisma mock |
| Component | AlertBell badge count, AlertList filtering, PreferenceToggle | Vitest + React Testing Library |
| E2E | Full flow: create item → transition to incident → verify alert appears → ack | Playwright (future) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

- Dev: `prisma db push` (existing pattern)
- Prod: Blocked by ADR-005 baseline prerequisite — must inspect/backup/baseline before applying
- No feature flags needed; alerts are additive and don't modify existing behavior
- Default `NotificationPreference` rows seeded per project member on first access

## Open Questions

- [ ] Should `dismissedAt` alerts be purged after N days, or kept indefinitely for audit?
- [ ] Scan endpoint: should it return the generated alerts, or just a count?
- [ ] Preference defaults: all alert types enabled by default, or only critical?
