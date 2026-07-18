## Exploration: Phase 11 — Advanced Features

### Current State

ManteMap is fully built across 10 completed phases (~2,003 tests). The codebase has mature infrastructure:

- **Items**: EAV pattern with Item + ItemFieldValue, dynamic forms, configurable statuses
- **Documents**: Versioned upload via StorageDriver (Local/S3-ready), expirations with alerts
- **Floor Plans**: React Konva (^10.3.0) with normalized-coordinate markers, zoom/pan, filter toolbar
- **Notifications**: Hybrid alert generation + NotificationDispatcher with ChannelRegistry (4 channels), delivery audit log
- **API**: Next.js App Router API routes, service/repository separation, Zod validation
- **UI**: Tailwind responsive, shadcn/ui components, TanStack Query

No dependencies exist yet for QR, PDF, or OCR. Konva ^10.3.0 is installed with `react-konva` ^19.2.5.

### Affected Areas

| Area | Features | Why Affected |
|------|----------|-------------|
| `packages/database/prisma/schema.prisma` | QR, Webhooks, Polygons, Layers, OCR | New models/fields needed |
| `apps/web/src/lib/services/notification-dispatcher.ts` | Webhooks | Exact pattern to replicate for HTTP webhook dispatch |
| `apps/web/src/lib/services/channels/channel-registry.ts` | Webhooks | Can register WebhookChannel following existing pattern |
| `apps/web/src/components/floor-plans/floor-plan-canvas.tsx` | Polygons, Layers | Add PolygonLayer parallel to MarkerLayer |
| `apps/web/src/components/floor-plans/marker-layer.tsx` | Layers | Extend filter logic for categories |
| `apps/web/src/components/floor-plans/viewer-toolbar.tsx` | Layers | Add layer toggle UI |
| `apps/web/src/components/floor-plans/floor-plan-utils.ts` | Polygons, Layers | Coordinate utilities for polygon vertices |
| `apps/web/src/hooks/use-floor-plans.ts` | Polygons, Layers | TanStack Query hooks for polygon CRUD + layer filter |
| `apps/web/src/components/items/item-detail.tsx` | QR, PDF Export, Mobile Inspections | Add QR display + export button + scan entry |
| `apps/web/src/lib/services/item-service.ts` | QR | Generate QR code data URL |
| `apps/web/src/lib/services/document-service.ts` | OCR | Hook OCR processing into document upload |
| `apps/web/src/lib/storage/storage-driver.ts` | PDF Export, OCR | Read/write generated PDFs, OCR results |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/page.tsx` | QR, PDF Export | Server-side data for QR/PDF |
| `apps/web/next.config.ts` | QR | May need to configure image domains |
| `apps/web/src/lib/services/alert-service.ts` | Webhooks | Alert generation already hooks into services |

---

### 1. QR Codes

#### Current Codebase Support
- **Item model** has `id` + `slug` — QR encodes URL to item detail page
- **Next.js API routes** exist for file generation/download
- **TanStack Query hooks** pattern exists (`use-items.ts`) for extending
- **No QR library installed** — needs `qrcode` (npm) or `qrcode.react`

#### Technical Approach

**Option A: Client-side QR with `qrcode.react`**
- Install `qrcode.react` (3KB gzip)
- Drop-in `<QRCode value={url} />` component in item detail
- QR content: URL to item page
- "Print QR" button triggers browser print or downloads SVG

| Pros | Cons | Complexity |
|------|------|------------|
| Zero server changes | No programmatic server-side generation | Low |
| Works offline after page load | SVG quality limited for print | |
| Component-level, composable | | |

**Option B: Server-generated QR via `qrcode` (Node.js)**
- Install `qrcode` npm package
- API route: `GET /api/projects/{projectId}/items/{itemId}/qr` → returns PNG/SVG
- Add QR button to item detail page
- Print-ready QR sheets: `GET /api/projects/{projectId}/items/qr-sheet` — generates multiple QR codes per page

| Pros | Cons | Complexity |
|------|------|------------|
| Server-generated = consistent output | One extra API call per QR | Low-Medium |
| Can batch-generate QR sheets | | |
| Print-optimized PNG at any resolution | | |
| QR exists even if React fails to load | | |

**Recommendation**: Option B (server-generated). It enables batch printing (QR sheets for 50 items) which is the actual use case — facility managers printing labels for physical assets. Create a new `QRCodeService` that wraps the `qrcode` library and generates both single and batch outputs.

#### Schema Changes
```prisma
// New model — optional, QR could be purely computed
model ItemQRCode {
  id        String   @id @default(cuid())
  itemId    String   @unique
  storagePath String? // If we store generated images
  createdAt DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

#### Feasibility: Easy (1-2 days)
#### Dependencies: None
#### User Value: High — facility managers need physical asset labels
#### Risks: Low

---

### 2. Mobile Inspections

#### Current Codebase Support
- **Tailwind responsive design** exists but hasn't been mobile-optimized explicitly
- **Item detail page** renders on any device width
- **Status transitions** already exists (`status-transition.tsx`)
- **No mobile-specific views** or camera integration

#### Technical Approach

**Option A: Camera-first inspection flow**
- Install `html5-qrcode` (~20KB) for QR scanning via camera
- Add `/projects/{projectId}/inspect` route — opens camera, scans QR, shows item
- Optimized mobile view: large buttons, touch-friendly status change, quick checklist
- Inspection form: mark status, add notes, take photo

| Pros | Cons | Complexity |
|------|------|------------|
| Full on-site inspection workflow | Needs camera permissions handling | Medium |
| Uses deployed QR codes | iOS/Android camera quirks | |
| High value for maintenance techs | Testing across devices | |

**Option B: Mobile-friendly item view only**
- No scanning: user opens item from list on phone
- Responsive item card with large tap targets
- Quick status transitions, document view

| Pros | Cons | Complexity |
|------|------|------------|
| No camera complexity | No "scan to view" flow | Low |
| Works immediately | Lower UX value | |

**Recommendation**: Option A, but slice into two sub-phases: (1) responsive optimizations first, (2) camera scanning second. The scanning depends on QR codes (Feature 1) being complete.

#### Schema Changes
```prisma
// Inspection record (optional for logging)
model Inspection {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  statusId  String?
  notes     String?
  photoPath String?  // StorageDriver for inspection photos
  createdAt DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
}
```

#### Feasibility: Medium (3-4 days, depends on QR)
#### Dependencies: Feature 1 (QR Codes)
#### User Value: High — core on-site use case
#### Risks: Medium — camera APIs vary across mobile browsers

---

### 3. Webhooks

#### Current Codebase Support
- **NotificationDispatcher** is the exact pattern needed — fire-and-forget dispatch, channel registry, delivery audit log
- **ChannelRegistry + NotificationChannel interface** is perfect for extending — a `WebhookChannel` implements the same interface as `SlackChannel`
- **AlertService** generates alerts for item status changes, document expirations — hook into these
- **UserChannelConfig** model stores config per user per channel type — extend with `webhook` type
- **NotificationDelivery** model provides the audit trail

#### Technical Approach

**Option A: Extend existing NotificationDispatcher**
- Register `WebhookChannel` in ChannelRegistry (exact same pattern as Email/Slack/Teams/Telegram)
- Webhook config: URL + signing secret + event filters stored in `UserChannelConfig.config`
- Events: reuse existing alert types (STATUS_INCIDENT, STATUS_BLOCKING, DOCUMENT_EXPIRING, EVENT_UPCOMING)
- Payload: JSON POST with HMAC-SHA256 signature header
- Response: log delivery result to NotificationDelivery

| Pros | Cons | Complexity |
|------|------|------------|
| Zero new architecture — reuses proven pattern | Limited to alert events (not arbitrary CRUD) | Medium |
| Delivery audit log included | | |
| Retry logic already in dispatcher | | |
| No new models needed | | |

**Option B: Standalone WebhookService**
- New `WebhookEvent` model: type, payload, status, retry count
- New `WebhookService` with retry queue
- Hooks in item/document/event services
- Full CRUD event coverage

| Pros | Cons | Complexity |
|------|------|------------|
| Covers ALL CRUD events, not just alerts | Duplicates existing infrastructure | High |
| Retry queue with backoff | New models, new schema, new service | |
| Finer event granularity | 2-3x more work | |

**Recommendation**: Option A. The existing dispatcher + channel pattern is perfectly suited. Webhooks ARE just another notification channel with HTTP POST. Add a `WebhookChannel` and optionally a new `WebhookConfig` model if URL-per-event-type granularity is needed beyond what `UserChannelConfig.config` supports.

#### Schema Changes
```prisma
// Minimal — UserChannelConfig already covers this:
// channelType = 'webhook'
// config = { url: string, secret: string, events: string[] }

// Only if URL-per-event-type granularity needed:
model WebhookEndpoint {
  id            String   @id @default(cuid())
  projectId     String
  name          String
  url           String
  secret        String?
  eventTypes    String[] // e.g. ["item.created", "item.updated", "document.expired"]
  active        Boolean  @default(true)
  retryCount    Int      @default(3)
  createdAt     DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

#### Feasibility: Medium (3-4 days)
#### Dependencies: None (reuses existing infrastructure)
#### User Value: High — integration with external systems (ERP, CMDB, ticketing)
#### Risks: Low — proven pattern, no new architectural risk

---

### 4. Polygons on Floor Plans

#### Current Codebase Support
- **React Konva ^19.2.5** installed — `Line` with `closed={true}` renders polygons
- **FloorPlanCanvas** has Stage + Layer architecture — can add a PolygonLayer
- **MarkerLayer** pattern (normalized coords → pixel) exactly parallels polygon needs
- **LocationMarker** model stores point data — polygon data needs similar storage
- **FloorPlanUtils** has normalized ↔ pixel conversion — extend for polygon vertices

#### Technical Approach

**Option A: Extend LocationMarker model with type discriminator**
- Add `type` field: `POINT | POLYGON`
- Add `points` JSON field for polygon vertex array `[{x, y}, ...]`
- Same API routes, same hooks, same coordinate system
- New PolygonLayer component renders Konva `<Line closed={true}>`
- Drawing mode: click to add vertices, double-click to close

| Pros | Cons | Complexity |
|------|------|------------|
| Minimal schema changes | Model becomes polymorphic | Medium |
| Reuses all existing CRUD | Some complexity in drawing UI | |
| Same normalized coordinate system | | |

**Option B: New FloorPlanPolygon model**
- Separate `FloorPlanPolygon` model with `points`, `fillColor`, `strokeColor`, `label`
- New API routes, hooks, components
- Cleaner separation

| Pros | Cons | Complexity |
|------|------|------------|
| Clean separation of concerns | More code, 2x the files | Medium-High |
| Validates at model level | More migrations | |
| Easier to query separately | | |

**Recommendation**: Option A. The polymorphic approach (type discriminator + points JSON) is simpler and matches how Konva itself handles shapes — every shape is fundamentally a set of coordinates. Save the migration cost. Add `POLYGON_LAYER` support as a natural extension of the LocationMarker model.

#### Schema Changes
```prisma
// Extend LocationMarker:
model LocationMarker {
  // ... existing fields ...
  type   String  @default("POINT")  // POINT | POLYGON
  points Json?    // [{x, y}, ...]  — only for POLYGON
  fillColor String?
  strokeColor String?
  strokeWidth Float? @default(2)
}
```

#### Feasibility: Medium (3-5 days)
#### Dependencies: None (floor plan infrastructure already exists)
#### User Value: Medium — zone management for industrial plants, safety zones
#### Risks: Medium — drawing interaction UI complexity, coordinate transformation accuracy

---

### 5. Layers

#### Current Codebase Support
- **ViewerToolbar** already has `FilterState` with `search` field
- **MarkerLayer** has `filter` prop + `filterMarkers()` utility
- **Floor-plan-viewer spec** already mentions "type and status layer filters"
- **Konva Layer component** supports multiple layers natively

#### Technical Approach

**Option A: Extend FilterState with category toggles**
- Add `categories: string[]` to `MarkerSummary`
- Extend `FilterState` with `categories: Record<string, boolean>`
- UI: toggle button group in toolbar (e.g., "Safety", "Equipment", "HVAC", "Electrical")
- Same MarkerLayer, just smarter filtering

| Pros | Cons | Complexity |
|------|------|------------|
| Minimal code changes | Categories need to be sourced from items | Low-Medium |
| Reuses all existing infrastructure | or manually assigned | |
| Natural extension of existing filters | | |

**Option B: Multiple Konva Layers**
- Group markers into Konva `<Layer>` components by category
- Toggle layer visibility via `Layer.visible()` property
- Better performance for large marker sets

| Pros | Cons | Complexity |
|------|------|------------|
| Performance benefit for 100+ markers | More complex state management | Medium |
| Konva handles visibility natively | | |

**Recommendation**: Option A for v1. Add `layer` field to MarkerSummary, extend FilterState. If performance becomes an issue with 500+ markers, consider Option B later.

#### Schema Changes
```prisma
// Add to LocationMarker:
model LocationMarker {
  // ... existing fields ...
  layer String?  // e.g. "safety", "equipment", "hvac", "electrical"
}
```

#### Feasibility: Easy (1-2 days)
#### Dependencies: None (pure UI extension)
#### User Value: Medium — useful for complex floor plans with many markers
#### Risks: Low

---

### 6. PDF Export

#### Current Codebase Support
- **StorageDriver** reads/writes files — can store generated PDFs
- **DocumentService** already handles file downloads via API routes
- **CSV export** (Phase 9) establishes the pattern: generate → stream → download
- **React/Server rendering** for HTML content that can be converted to PDF
- **No PDF library installed**

#### Technical Approach

**Option A: Server-side with `@react-pdf/renderer`**
- Install `@react-pdf/renderer` (React components → PDF)
- Create shared `<ItemReport>` PDF component
- API route generates PDF on demand
- Content: item name, status, field values, documents list, QR code (if available)
- Download button on item detail page

| Pros | Cons | Complexity |
|------|------|------------|
| React-based, familiar | Must create PDF-specific components | Medium |
| No headless browser | Limited styling vs CSS | |
| Streams to client | React PDF has quirks | |
| Works in serverless | | |

**Option B: Server-side with Puppeteer**
- Install `puppeteer` or `chrome-aws-lambda`
- Render HTML page headlessly, export to PDF
- Exact same CSS as web rendering

| Pros | Cons | Complexity |
|------|------|------------|
| Pixel-perfect output | 150MB+ Puppeteer binary | High |
| Same HTML/CSS | Cold start problems in serverless | |
| Full CSS support | Memory intensive | |

**Option C: Client-side with `html2canvas` + `jsPDF`**
- Capture DOM element → canvas → PDF in browser
- Zero server cost

| Pros | Cons | Complexity |
|------|------|------------|
| No server load | Limited to browser viewport | Low-Medium |
| Simple implementation | Quality issues with complex layouts | |
| | No batch/automated export | |

**Recommendation**: Option A (`@react-pdf/renderer`). It's the right fit — React-native-like components, server-side rendering, streams to client. Puppeteer is overkill for this (million-dollar architecture for a thousand-dollar problem). Client-side (Option C) is a fallback if server-side causes deployment issues.

#### Schema Changes
```prisma
// Optional — cache generated PDFs:
model ExportDocument {
  id        String   @id @default(cuid())
  itemId    String
  type      String   // "item-sheet" | "inspection-report"
  storagePath String
  createdAt DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

#### Feasibility: Medium (3-4 days)
#### Dependencies: None
#### User Value: Medium — compliance reporting, printing physical sheets
#### Risks: Medium — React-PDF rendering differences from browser CSS, long-content pagination

---

### 7. OCR / Document AI

#### Current Codebase Support
- **DocumentService** has upload flow — hook OCR after file storage
- **StorageDriver** can read uploaded files for processing
- **Document model** has `metadata` JSON field — store extracted data
- **No OCR library installed**, no image processing

#### Technical Approach

**Option A: Server-side with `tesseract.js`**
- Install `tesseract.js` (~8MB trained data)
- Process on document upload: fire-and-forget
- Extract: dates (via regex on OCR output), document numbers, key values
- Store extracted metadata in `Document.metadata`

| Pros | Cons | Complexity |
|------|------|------------|
| Works offline, no API cost | Slow (5-15s per page) | Medium |
| Simple integration | Accuracy varies wildly | |
| | 8MB+ of trained data in deployment | |

**Option B: Cloud API (Google Vision / AWS Textract)**
- Offload OCR to cloud service
- Webhook or polling pattern for async results
- Higher accuracy, faster processing

| Pros | Cons | Complexity |
|------|------|------------|
| High accuracy (90%+) | Ongoing API costs | Medium |
| Fast processing | Requires API key management | |
| Handles handwriting | Network dependency | |
| Document AI can extract fields directly | | |

**Option C: Skip — defer to future phase**
- OCR is listed as "nice to have" in AGENTS.md
- `tesseract.js` accuracy is poor for document dates
- Cloud API adds external dependency and cost
- Low user value vs. implementation complexity

| Pros | Cons | Complexity |
|------|------|------------|
| Zero work | Feature not available | N/A |

**Recommendation**: Option C (defer) for this phase, or Option B (cloud API) if user explicitly wants it. tesseract.js is NOT production-ready for date extraction from industrial documents (quality varies too much). If we do it, do it right with Google Document AI — but that's a Phase 12 candidate.

#### Schema Changes
```prisma
// Document model already has metadata JSON — no schema change needed
// Just populate: metadata.ocr = { extractedDates: [...], confidence: 0.85 }
```

#### Feasibility: Hard (5-7 days for quality extraction)
#### Dependencies: Document service (exists)
#### User Value: Medium-Low — nice to have, not critical for MVP
#### Risks: High — tesseract.js accuracy is unreliable; cloud APIs add cost/complexity

---

## Executive Summary

### Top 3 Recommended Features (by value/effort ratio)

1. **QR Codes** (Easy, 1-2 days, High value) — Foundation for physical asset tagging
2. **Webhooks** (Medium, 3-4 days, High value) — Enables external system integration, proven pattern
3. **Mobile Inspections** (Medium, 3-4 days, High value) — Core on-site use case, depends on QR

### Grouping & Implementation Order

| Group | Features | Effort | Dependencies | Why Together |
|-------|----------|--------|-------------|-------------|
| **Slice A** | QR Codes + Layers | 2-4 days | None | QR is foundation, Layers is quick win |
| **Slice B** | Webhooks | 3-4 days | None | Independent, high value |
| **Slice C** | Mobile Inspections | 3-4 days | Slice A (QR) | Needs QR to scan |
| **Slice D** | Polygons + PDF Export | 6-9 days | None | Independent but medium effort |
| **Deferred** | OCR / Document AI | Next phase | None | Low accuracy/value ratio |

### Total Estimated Effort

| Scope | Total | Slices |
|-------|-------|--------|
| **Slice A** (QR + Layers) | 2-4 days | Easy standalone |
| **Slice B** (Webhooks) | 3-4 days | Medium standalone |
| **Slice C** (Mobile) | 3-4 days | Medium, depends on A |
| **Slice D** (Polygons + PDF) | 6-9 days | Medium standalone |
| **Deferred** (OCR) | — | Not recommended |
| **Phase total** | **14-21 days** | **Across 4 slices** |

### Recommended First Slice

**Slice A — QR Codes + Layers** (2-4 days). Lowest risk, highest user value per day, establishes the QR foundation that Mobile Inspections depend on.

### Risks

- **OCR deferral**: If user expects OCR, must set clear expectations about accuracy
- **Mobile camera testing**: Requires real device testing, not just emulator
- **Webhook security**: Must include HMAC signing and optional IP whitelisting
- **PDF library quirks**: @react-pdf/renderer has known layout edge cases

### Ready for Proposal

Yes. This exploration covers all 7 features with concrete approaches, schema changes, dependencies, and risks. The orchestrator should present the two-slice proposal (Slice A as immediate, then Slice B/C as phase continuation) and get user buy-in on the OCR deferral.
