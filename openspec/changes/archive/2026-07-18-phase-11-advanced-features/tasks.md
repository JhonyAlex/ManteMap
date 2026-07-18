# Tasks: Phase 11 — Advanced Features

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,200 authored (4 slcs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 6 stacked PRs (A-1 → A-2 → B → C → D-1 → D-2) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | QR service + single QR API (Slice A-1) | PR 1 | `pnpm test:web -- qr-service` | `curl GET /api/projects/p1/items/i1/qr` → PNG stream | Revert PR 1; ItemQRCode table + qr-service, qr route |
| 2 | QR sheet UI + Layer toggles (Slice A-2) | PR 2 | `pnpm test:web -- qr-sheet layer-toggle` | Browser: item detail QR modal, viewer toolbar layers | Revert PR 2; QR components, layer-toggle, viewer mods |
| 3 | Webhook channel + API (Slice B) | PR 3 | `pnpm test:web -- webhook-channel` | `POST /api/projects/p1/webhooks` → endpoint created | Revert PR 3; WebhookEndpoint table + channel + routes |
| 4 | QR scanner + inspect page + form (Slice C) | PR 4 | `pnpm test:web -- qr-scanner inspection` | Browser: /projects/p1/inspect with camera fallback | Revert PR 4; Inspection table, scanner hook, page |
| 5 | Polygon layer + drawing hook (Slice D-1) | PR 5 | `pnpm test:web -- polygon-layer polygon-drawing` | Browser: floor plan drawing mode, vertex drag | Revert PR 5; type/points fields, polygon-layer, hook |
| 6 | PDF export service + component (Slice D-2) | PR 6 | `pnpm test:web -- pdf-service item-sheet-document` | `curl GET /api/projects/p1/items/i1/export/pdf` → file | Revert PR 6; pdf-service, pdf route, ExportPdf button |

---

## PR 1: QR Service + Single QR API (Slice A-1)

- [x] 1.1 Add `ItemQRCode`, `itemQrCodes` rel to schema.prisma; gen migration (also added `layer` field to LocationMarker per design)
- [x] 1.2 Create `qr-service.ts` — `QRCodeService.generateQR()` wrapping `qrcode.toDataURL`, URL builder `{APP_URL}/p/{projectSlug}/i/{itemSlug}`
- [x] 1.3 Create `GET /api/projects/[projectId]/items/[itemId]/qr/route.ts` — `requireProjectMember`, returns image/png
- [x] 1.4 Install `qrcode` npm package
- [x] 1.5 RED: Write unit tests for QRCodeService URL format + generation (Vitest + mocked `qrcode.toDataURL`) — 6 tests passing
- [x] 1.6 RED: Write integration tests for GET /qr endpoint — valid image, 404, auth — 7 tests passing
- [x] 1.7 GREEN + REFACTOR: All 19 new tests pass, QRCodeDisplay component + tests, ItemDetail integration

## PR 2: QR Sheet UI + Layers (Slice A-2)

- [x] 2.1 Add `layer String?` to LocationMarker schema, gen migration
- [x] 2.2 Create `POST /api/projects/[projectId]/items/qr-sheet/route.ts` — `QRCodeService.generateQRSheet()` grid layout
- [x] 2.3 Create `QRCodeDisplay` component — modal over item detail, fetch QR via API, loading/error/success states
- [x] 2.4 Create `QRSheet` component — batch POST, renders grid `<img>`, print button
- [x] 2.5 Add "Show QR" + "Print QR" buttons to `ItemDetail`
- [x] 2.6 Add `categories: Record<string, boolean>` to `FilterState` + `layer?: string | null` to `MarkerSummary`
- [x] 2.7 Extend `filterMarkers()` with category AND logic alongside search
- [x] 2.8 Create `LayerToggleGroup` — checkbox buttons for each distinct layer value
- [x] 2.9 Wire `LayerToggleGroup` into `ViewerToolbar` — `categories` filter flows to `MarkerLayer`
- [x] 2.10 RED: Write component tests for QRCodeDisplay, QRSheet, LayerToggleGroup
- [x] 2.11 RED: Write unit tests for filterMarkers with categories
- [x] 2.12 RED: Integration tests for POST /qr-sheet — 10-item batch, partial missing items
- [x] 2.13 GREEN + REFACTOR: Make all pass

## PR 3: Webhooks (Slice B)

- [x] 3.1 Add `WebhookEndpoint` model to schema.prisma (id, projectId, name, url, secret, eventTypes, active, retryCount, createdAt); gen migration
- [x] 3.2 Create `webhook-repository.ts` — queryByProjectId, create, delete, getById; exclude secret from list/get responses
- [x] 3.3 Create `WebhookChannel` implementing `NotificationChannel` — POST with HMAC-SHA256, event-type filtering, 10s timeout, delivery logging
- [x] 3.4 Register `WebhookChannel` in `ChannelRegistry` via `channels/index.ts buildRegistry()`
- [x] 3.5 Create `GET+POST /api/projects/[projectId]/webhooks/route.ts` — list (secret excluded), create endpoint
- [x] 3.6 Create `DELETE /api/projects/[projectId]/webhooks/[endpointId]/route.ts` — owner-only auth
- [x] 3.7 RED: Write unit tests for WebhookChannel — signPayload, event-type filter, timeout, missing secret
- [x] 3.8 RED: Write integration tests for all 3 webhook endpoints — secret exclusion, auth, CRUD
- [x] 3.9 GREEN + REFACTOR: Make all pass

## PR 4: Mobile Inspections (Slice C)

- [x] 4.1 Add `Inspection` model to schema.prisma (id, itemId, userId, statusId, notes, photoPath, createdAt); gen migration
- [x] 4.2 Create `useQRScanner()` hook — wraps `html5-qrcode`, camera lifecycle, `{ result, error, scanning, stop }`
- [x] 4.3 Create `inspection-repository.ts` — create, listByItem, listByUser
- [x] 4.4 Create `inspection-service.ts` — logInspection, listInspections
- [x] 4.5 Create `InspectionForm` component — status dropdown, notes textarea, submit → POST inspection API
- [x] 4.6 Create `/projects/[projectId]/inspect/page.tsx` — camera view (MI-001) with manual search fallback (MI-005), permission handling (MI-006)
- [x] 4.7 Modify `ItemDetail` — add mobile-responsive layout (stacked, ≥44px, full-width status), "Log Inspection" entry
- [x] 4.8 Install `html5-qrcode` npm package
- [x] 4.9 RED: Write hook tests for useQRScanner — decode, error, camera unavailable
- [x] 4.10 RED: Write component tests for InspectionForm — submit with/without status, validation
- [x] 4.11 RED: Write integration tests for inspection API + mobile-responsive view
- [x] 4.12 GREEN + REFACTOR: Make all pass

## PR 5: Polygons (Slice D-1)

- [x] 5.1 Add `type`, `points`, `fillColor`, `strokeColor`, `strokeWidth` to LocationMarker schema; gen migration — default `type="POINT"`, validate min 3 vertices for POLYGON
- [x] 5.2 Extend `MarkerSummary` types in `use-floor-plans.ts` — add type, points, fillColor, strokeColor, strokeWidth
- [x] 5.3 Add `normalizedVerticesToPixel()` + `pixelToNormalizedVertices()` to floor-plan-utils
- [x] 5.4 Create `usePolygonDrawing()` hook — idle/drawing/closed FSM, click-add vertex, double-click/ESC close, cancel
- [x] 5.5 Create `PolygonLayer` — renders Konva `<Line closed>` for each POLYGON marker, vertex drag handles via `Circle`
- [x] 5.6 Modify `FloorPlanCanvas` — add PolygonLayer alongside MarkerLayer, wire drawing mode
- [x] 5.7 Modify `MarkerLayer` — filter by type (POINT vs POLYGON) alongside search
- [x] 5.8 RED: Write unit tests for usePolygonDrawing — state transitions, vertex placement, cancel
- [x] 5.9 RED: Write component tests for PolygonLayer — render, vertex drag, closed shape
- [x] 5.10 RED: Write unit tests for coordinate conversion functions
- [x] 5.11 GREEN + REFACTOR: Make all pass

## PR 6: PDF Export (Slice D-2)

- [x] 6.1 Create `ItemSheetDocument` — `@react-pdf/renderer` `<Document><Page>` with item name, status, location path, field values (label+value, null→"—"), document list, generation timestamp
- [x] 6.2 Create `pdf-service.ts` — `ItemPdfService.generate()` fetches item+fields+status+location, renders ItemSheetDocument, streams PDF
- [x] 6.3 Create `GET /api/projects/[projectId]/items/[itemId]/export/pdf/route.ts` — `Content-Type: application/pdf`, `Content-Disposition: attachment`
- [x] 6.4 Create `ExportPDFButton` — loading spinner, disabled state, triggers fetch → blob download with filename `{slug}.pdf`
- [x] 6.5 Add "Export PDF" button to `ItemDetail` — wire to ExportPDFButton
- [x] 6.6 Install `@react-pdf/renderer` npm package
- [x] 6.7 RED: Write unit tests for pdf-service — item data assembly, field rendering (PDF-002), QR inclusion (PDF-003)
- [x] 6.8 RED: Write integration tests for GET /export/pdf — valid PDF, 404, streaming response (PDF-004), rendering error 500 (PDF-005)
- [x] 6.9 RED: Write component tests for ExportPDFButton — loading, success, error states
- [x] 6.10 GREEN + REFACTOR: Make all pass
