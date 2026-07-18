# Proposal: Phase 11 — Advanced Features

## Intent

Extend ManteMap from digital document management to physical-world integration. Facility managers need QR-labeled assets for on-site scanning, maintenance techs need mobile inspection workflows, external systems (ERP, ticketing) need webhook events, and floor plans need polygon zones with category layers.

## Scope

### In Scope (4 Slices)
| Slice | Features | Effort | Depends On |
|-------|----------|--------|------------|
| **A** | QR Codes + Layers | 2–4 days | None |
| **B** | Webhooks | 3–4 days | None |
| **C** | Mobile Inspections | 3–4 days | Slice A (QR scanning) |
| **D** | Polygons + PDF Export | 6–9 days | None |

**Phase total**: 14–21 days across 4 deliverable slices.

### Out of Scope
- OCR / Document AI → deferred to Phase 12 (low accuracy/value ratio)
- Real-time WebSocket webhooks (HTTP POST only)
- Native mobile app (browser-based only)
- BIM/GIS integration

## Capabilities

### New Capabilities
- `qr-codes`: Server-side QR generation (`qrcode`), single + batch API routes, print-ready output
- `webhooks`: WebhookChannel in NotificationDispatcher, HMAC-SHA256 signing, per-endpoint event filtering
- `mobile-inspections`: Camera QR scanning (`html5-qrcode`), mobile-optimized views, Inspection audit model
- `polygons-floor-plans`: Polymorphic LocationMarker (POINT|POLYGON), Konva polygon drawing with vertex interaction
- `pdf-export`: Server-side PDF via `@react-pdf/renderer`, item sheet template, download API route

### Modified Capabilities
- `floor-plan-management`: Extend LocationMarker with `type`, `points` (JSON), `layer`, `fillColor`, `strokeColor`
- `floor-plan-viewer`: Extend FilterState with category toggles; add PolygonLayer alongside MarkerLayer
- `item-management`: Add QR display + PDF export actions to item detail
- `external-notification-delivery`: Register WebhookChannel in ChannelRegistry; extend UserChannelConfig for webhook configs

## Approach

Reuse existing infrastructure: QR codes use server API pattern from Phase 5 (Document download), webhooks extend the proven NotificationDispatcher/ChannelRegistry from Phase 10, polygons extend the Konva + normalized-coordinate system from Phase 7, PDF export follows the CSV export pattern from Phase 9.

| Slice | npm dep | Schema change | Test est. |
|-------|---------|---------------|-----------|
| A: QR + Layers | `qrcode` | ItemQRCode (opt); +`layer` on LocationMarker | ~100 |
| B: Webhooks | None (fetch native) | WebhookEndpoint (opt); UserChannelConfig extension | ~80 |
| C: Mobile | `html5-qrcode` | Inspection model | ~90 |
| D: Polygons+PDF | `@react-pdf/renderer` | +`type`,`points` on LocationMarker; ExportDocument (opt) | ~150 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mobile camera API varies across browsers | Medium | Feature-detect camera; fallback to manual item lookup |
| Webhook HMAC key exposure | Low | Secret stored encrypted in config; excluded from all logs |
| @react-pdf/renderer layout edge cases | Medium | Single-page template first; validate with real data |
| Polygon drawing UI complexity | Medium | 3-vertex minimum, double-click to close, undo-last-vertex |

## Rollback Plan

Each slice is independently revertible as a standalone PR:
- **A**: Remove `qrcode`, drop ItemQRCode, drop `layer` field
- **B**: Unregister WebhookChannel; configs become inert JSON
- **C**: Remove `html5-qrcode`, drop Inspection table
- **D**: Remove `@react-pdf/renderer`, drop `type`/`points` fields

Rollback = revert merge commit per slice.

## Dependencies

- `qrcode` (~50 KB) · `html5-qrcode` (~20 KB) · `@react-pdf/renderer` (~500 KB)
- No external services required (all self-contained)

## Success Criteria

- [ ] QR batch generation produces valid, scannable codes for 50+ items; print layout renders correctly
- [ ] Webhook delivers signed JSON payload to configured URL; invalid signature rejected
- [ ] Mobile camera scans QR → opens correct item detail in < 3 seconds
- [ ] Polygons render with fill/stroke on floor plans; vertex drag works on touch
- [ ] PDF export produces single-page item sheet with all field values, status, and location
- [ ] All new tests pass; existing ~2,003 tests remain green
