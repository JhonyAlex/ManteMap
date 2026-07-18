# Design: Phase 11 — Advanced Features

## Technical Approach

Extend ManteMap with four independently deliverable slices reusing existing infrastructure: QR codes via server-side `qrcode` (Phase 5 download pattern), webhooks via `NotificationChannel` adapter (Phase 10 dispatcher), mobile inspections via `html5-qrcode` hook (Phase 4 item detail), and polygons/PDF via Konva polymorphism + `@react-pdf/renderer` (Phase 7 floor plans + Phase 9 CSV export pattern). Each slice is independently revertible; no cross-slice coupling beyond QR → Mobile.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| QR generation | Server-side `qrcode` vs client-side `qrcode.react` | Server: batch sheets + print control. Client: simpler | Server-side — batch sheet is the core use case |
| Webhook architecture | Extend NotificationDispatcher vs standalone WebhookService | Extend: zero new infra, reuse audit. Standalone: CRUD events, more code | Extend dispatcher — webhooks ARE another notification channel |
| Marker polymorphism | Type discriminator on LocationMarker vs separate Polygon model | Discriminator: fewer files, same API. Separate: cleaner model | Type discriminator — saves migration cost, matches Konva shape model |
| PDF engine | `@react-pdf/renderer` vs Puppeteer | React-PDF: 500KB, serverless-compatible. Puppeteer: 150MB, full CSS | React-PDF — right-sized; Puppeteer is overkill for item sheets |
| Layer filtering | Extend FilterState vs multiple Konva Layers | FilterState: minimal code. Multi-Layer: perf at 500+ markers | Extend FilterState for v1 — performance is not yet an issue |

## Slice A: QR Codes + Layers

### Architecture Overview

```
[Item Detail Page] ──click──→ [QRCodeDisplay modal] ──fetch──→ GET /api/.../qr → QRCodeService.generateQR()
[Batch Print UI]   ──click──→ POST /api/.../qr-sheet        → QRCodeService.generateQRSheet()
                                                                  │
                                                            qrcode library (PNG/SVG buffer)
```

Layers extend `FilterState.categoryToggle` and `MarkerSummary.layer`, flowing through `ViewerToolbar → FloorPlanCanvas → MarkerLayer.filterMarkers()`.

### Data Model

```prisma
model ItemQRCode {
  id          String   @id @default(cuid())
  itemId      String   @unique
  storagePath String?  // cache path if stored
  createdAt   DateTime @default(now())
  item        Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
}

// LocationMarker extension:
model LocationMarker {
  // ... existing fields ...
  layer       String?  // e.g. "safety", "equipment", "hvac", "electrical"
}
```

Migration: add `layer String?` to `location_markers`, create `item_qr_codes` table. No data migration — existing markers get null `layer`.

### API Design

| Route | Method | Input | Output |
|-------|--------|-------|--------|
| `/api/projects/[projectId]/items/[itemId]/qr` | GET | `?format=png\|svg&size=N` | `image/png` or `image/svg+xml` |
| `/api/projects/[projectId]/items/qr-sheet` | POST | `{ itemIds: string[] }` | `image/png` grid sheet |

Auth: `requireProjectMember()` on both endpoints. Service layer separates QR generation from HTTP.

### Component Design

| Component | Props | Notes |
|-----------|-------|-------|
| `QRCodeDisplay` (new) | `{ itemId, projectId, size? }` | Modal content fetching QR image via API |
| `QRSheet` (new) | `{ projectId, itemIds }` | POSTs batch, renders `<img>` of returned sheet |

Modified components:
- `ItemDetail`: add "Show QR" + "Print QR" buttons per spec (item-management)
- `MarkerSummary` (hook type): add `layer?: string | null`
- `MarkerFilter` (util type): add `categories?: Record<string, boolean>`
- `ViewerToolbar`: add `<LayerToggleGroup>` with category checkboxes
- `FilterState`: add `categories?: Record<string, boolean>`
- `filterMarkers()`: add category AND logic alongside existing search

### Service Design

```typescript
// apps/web/src/lib/services/qr-service.ts (new)
class QRCodeService {
  async generateQR(itemSlug: string, projectSlug: string, format: 'png'|'svg', size: number): Promise<Buffer>
  async generateQRSheet(items: Array<{id, slug, projectSlug}>, size: number): Promise<Buffer>
  private buildItemUrl(projectSlug: string, itemSlug: string): string // → {APP_URL}/p/{projectSlug}/i/{itemSlug}
}
```

URL pattern per QR-004: `{APP_URL}/p/{projectSlug}/i/{itemSlug}`.

### npm Dependencies

| Package | Version | Size |
|---------|---------|------|
| `qrcode` | ^1.5.4 | ~50 KB |

### Testing Strategy (~100 tests)

| Layer | What | Approach |
|-------|------|----------|
| Unit | QRCodeService URL format, generation | Vitest + mocked `qrcode.toBuffer` |
| Unit | filterMarkers with categories | Vitest pure function |
| Component | QRCodeDisplay loading/error/success | Vitest + MSW mock |
| Component | LayerToggleGroup toggles | Vitest + Testing Library |
| Integration | GET /qr returns valid image | Vitest + API handler test |
| Integration | POST /qr-sheet with 3 items | Vitest + snapshot |

## Slice B: Webhooks

### Architecture Overview

```
AlertService.generateAlert() → NotificationDispatcher.dispatch()
  ├── email/slack/teams/telegram (existing)
  └── WebhookChannel.send()
        ├── query WebhookEndpoints WHERE projectId AND eventTypes includes alertType
        ├── for each endpoint:
        │     POST body = webhookTemplate(alert)
        │     X-ManteMap-Signature = HMAC-SHA256(body, endpoint.secret)
        └── log to NotificationDelivery (channelType="webhook")
```

`UserChannelConfig` with `channelType="webhook"` and `config={ webhookEndpointId }` links users to endpoints. The dispatcher queries endpoints through a new repository.

### Data Model

```prisma
model WebhookEndpoint {
  id        String   @id @default(cuid())
  projectId String
  name      String
  url       String
  secret    String?   // HMAC key — excluded from API responses
  eventTypes String[] // ["STATUS_INCIDENT", "DOCUMENT_EXPIRING", ...]
  active    Boolean  @default(true)
  retryCount Int     @default(3)
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@map("webhook_endpoints")
}
```

No modification to `UserChannelConfig` schema — the `config` JSON field stores `{ webhookEndpointId }` for `channelType="webhook"`. This avoids schema changes and follows the existing pattern for Slack/Teams/Telegram configs.

### API Design

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/projects/[projectId]/webhooks` | GET | Member | List endpoints (secret excluded) |
| `/api/projects/[projectId]/webhooks` | POST | Owner | Create endpoint `{ name, url, secret?, eventTypes, active }` |
| `/api/projects/[projectId]/webhooks/[endpointId]` | DELETE | Owner | Delete endpoint |

### Component Design

No new UI components — webhook configuration handled via existing channel-config page pattern (settings page from Phase 10). A `WebhookConfigForm` component follows the same pattern as `SlackConfigForm`/`TeamsConfigForm`.

### Service Design

```typescript
// apps/web/src/lib/services/channels/webhook-channel.ts (new)
class WebhookChannel implements NotificationChannel {
  readonly type = 'webhook';

  async send(alert, user, config?, projectName?): Promise<DeliveryResult> {
    // config.webhookEndpointId → query WebhookEndpoint
    // If endpoint.eventTypes excludes alert.alertType → skip
    // POST to endpoint.url with signed body
    // 10s timeout via AbortController
  }
  private signPayload(body: string, secret: string): string {
    // crypto.createHmac('sha256', secret).update(body).digest('hex')
  }
}

// apps/web/src/lib/services/channels/index.ts (modified)
// Register webhookChannel in buildRegistry()
```

Webhook template payload format:
```json
{
  "event": "STATUS_INCIDENT",
  "timestamp": "2026-07-18T14:30:00Z",
  "alert": { "id": "...", "title": "...", "severity": "CRITICAL", "message": "..." },
  "project": { "id": "...", "name": "Plant A" },
  "appUrl": "https://mante.saharapro.team"
}
```

### npm Dependencies

None — uses native Node.js `crypto` for HMAC and `fetch` for HTTP POST.

### Testing Strategy (~80 tests)

| Layer | What | Approach |
|-------|------|----------|
| Unit | WebhookChannel.signPayload | Vitest — known input/output |
| Unit | WebhookChannel event type filtering | Vitest — mock endpoint config |
| Unit | WebhookEndpoint CRUD service | Vitest + repository mock |
| Integration | WebhookChannel.send with success/failure/timeout | Vitest + MSW fetch mock |
| Integration | GET/POST/DELETE webhook endpoints | Vitest API route tests |
| Integration | Secret exclusion from GET response | Vitest — assert no `secret` field |

## Slice C: Mobile Inspections (Outline)

### Architecture

```
Camera Page (/inspect) → useQRScanner(html5-qrcode) → decode URL → resolve project+item → inspect page
Fallback: manual search input → item lookup by slug → inspect page
Inspect: status dropdown + notes + "Log Inspection" → POST Inspection → redirect to item detail
```

### Data Model
```prisma
model Inspection {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  statusId  String?
  notes     String?
  photoPath String?
  createdAt DateTime @default(now())
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  @@index([itemId])
  @@map("inspections")
}
```

### Key Components
- `useQRScanner()` hook — wraps `html5-qrcode`, handles camera lifecycle, returns `{ result, error, scanning, stop }`
- `/projects/[projectId]/inspect/page.tsx` — mobile-first page with camera or search fallback
- `InspectionForm` — status dropdown, notes textarea, submit
- `ItemDetail` — responsive modifications: stacked layout, `text-lg` touch targets, full-width status button

### npm: `html5-qrcode` ^2.3.8 (~20 KB)
### Tests: ~90 (hook tests, scanner component, inspection service, API routes)

## Slice D: Polygons + PDF Export (Outline)

### Architecture — Polygons

```
FloorPlanCanvas
  ├── KonvaImage Layer (existing)
  ├── MarkerLayer (existing — POINT type only)
  └── PolygonLayer (new — renders polygon Line+fill, vertex drag handles)
        └── floor-plan-utils: normalizedVerticesToPixel, pixelToNormalizedVertices
```

Drawing mode: state machine in `usePolygonDrawing()` hook — `idle → drawing → closed`. Click adds vertex, double-click/ESC closes, toolbar button cancels.

### Architecture — PDF Export

```
GET /api/projects/[id]/items/[id]/pdf → ItemPdfService.generate()
  ├── fetch item + field values + status + location
  ├── @react-pdf/renderer: ItemSheetDocument (React component → PDF stream)
  └── Response: application/pdf, Content-Disposition: attachment
```

### Data Model — LocationMarker extension
```prisma
model LocationMarker {
  // ... existing fields (x, y, itemId, label, color) ...
  type        String   @default("POINT")  // POINT | POLYGON
  points      Json?     // [{x: n, y: n}, ...] for POLYGON, min 3
  fillColor   String?   // hex, optional alpha
  strokeColor String?
  strokeWidth Float?    @default(2)
}
```

### Data Model — ExportDocument (optional cache)
```prisma
model ExportDocument {
  id          String   @id @default(cuid())
  itemId      String
  type        String   // "item-sheet"
  storagePath String
  createdAt   DateTime @default(now())
  item        Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  @@map("export_documents")
}
```

### Key Components
- `PolygonLayer` — Konva `Line closed={true}`, `Circle` vertex handles on drag
- `usePolygonDrawing()` — idle/drawing/closed FSM
- `ItemSheetDocument` — `@react-pdf/renderer` `<Document><Page>` with styled sections
- `ExportPDFButton` — loading state, triggers fetch → blob download

### npm: `@react-pdf/renderer` ^3.4.0 (~500 KB)
### Tests: ~150 (polygon drawing hook, PolygonLayer render, API validation, PDF stream, ItemSheetDocument)

## File Changes

| File | Action | Slice |
|------|--------|-------|
| `packages/database/prisma/schema.prisma` | Modify | All (new models + fields) |
| `apps/web/src/lib/services/qr-service.ts` | Create | A |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/qr/route.ts` | Create | A |
| `apps/web/src/app/api/projects/[projectId]/items/qr-sheet/route.ts` | Create | A |
| `apps/web/src/components/items/qr-code-display.tsx` | Create | A |
| `apps/web/src/components/items/qr-sheet.tsx` | Create | A |
| `apps/web/src/components/items/item-detail.tsx` | Modify | A, C |
| `apps/web/src/hooks/use-floor-plans.ts` | Modify | A, D |
| `apps/web/src/components/floor-plans/floor-plan-utils.ts` | Modify | A, D |
| `apps/web/src/components/floor-plans/viewer-toolbar.tsx` | Modify | A |
| `apps/web/src/components/floor-plans/layer-toggle-group.tsx` | Create | A |
| `apps/web/src/components/floor-plans/marker-layer.tsx` | Modify | A |
| `apps/web/src/lib/services/channels/webhook-channel.ts` | Create | B |
| `apps/web/src/lib/services/channels/index.ts` | Modify | B |
| `apps/web/src/lib/repositories/webhook-repository.ts` | Create | B |
| `apps/web/src/app/api/projects/[projectId]/webhooks/route.ts` | Create | B |
| `apps/web/src/app/api/projects/[projectId]/webhooks/[endpointId]/route.ts` | Create | B |
| `apps/web/src/hooks/use-qr-scanner.ts` | Create | C |
| `apps/web/src/app/(dashboard)/projects/[projectId]/inspect/page.tsx` | Create | C |
| `apps/web/src/lib/services/inspection-service.ts` | Create | C |
| `apps/web/src/lib/repositories/inspection-repository.ts` | Create | C |
| `apps/web/src/components/floor-plans/polygon-layer.tsx` | Create | D |
| `apps/web/src/hooks/use-polygon-drawing.ts` | Create | D |
| `apps/web/src/components/floor-plans/floor-plan-canvas.tsx` | Modify | D |
| `apps/web/src/lib/services/pdf-service.ts` | Create | D |
| `apps/web/src/components/pdf/item-sheet-document.tsx` | Create | D |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/pdf/route.ts` | Create | D |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Webhooks use native `fetch` with 10s timeout; QR and PDF are server-side generation with no shell execution.

## Migration / Rollout

Each slice is a standalone PR with its own migration. Rollback = revert merge commit. No feature flags required — features are additive and don't alter existing behavior. Slice order: A → B → C → D. Only C depends on A (QR codes must exist before mobile scanning).

## Open Questions

- [ ] Should webhook retry logic be implemented now or deferred? (dispatch is fire-and-forget per dispatcher pattern; retry would need a queue)
- [ ] Is `@react-pdf/renderer` compatible with the Next.js serverless/edge runtime where deployed?
- [ ] Should polygon self-intersection validation be enforced server-side or just warned client-side?
