# QR Codes Specification

## Purpose

Server-side QR code generation for physical asset labeling — single item QR, batch QR sheets, and print-ready output.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| QR-001 | Single-item QR generation via API | MUST |
| QR-002 | Batch QR sheet generation for multiple items | MUST |
| QR-003 | Print-optimized output with configurable format | MUST |
| QR-004 | QR encodes canonical URL to item detail page | MUST |
| QR-005 | Error handling for non-existent items | MUST |

### Requirement: Single-item QR generation (QR-001)

The system MUST expose `GET /api/projects/{projectId}/items/{itemId}/qr` returning a QR image (PNG default). Format SHALL be selectable via `?format=png|svg`. Resolution MUST be configurable via `?size=N`.

#### Scenario: Generate QR for existing item
- GIVEN an item with id `item-123` in project `proj-1`
- WHEN `GET /api/projects/proj-1/items/item-123/qr` is called
- THEN a valid QR code PNG is returned encoding `{APP_URL}/projects/proj-1/items/item-123`

#### Scenario: Non-existent item returns 404
- GIVEN item `nonexistent` does not exist
- WHEN QR generation endpoint is called
- THEN the API returns `404` with item not found error

### Requirement: Batch QR sheet generation (QR-002)

The system MUST expose `POST /api/projects/{projectId}/items/qr-sheet` accepting `{ itemIds: string[] }`. Output SHALL be a single PNG sheet with multiple QR codes arranged in a grid. Each QR MUST include the item name label beneath it.

#### Scenario: Batch QR for 10 items
- GIVEN 10 items in a project
- WHEN batch QR sheet endpoint is called with all 10 itemIds
- THEN a single image is returned with 10 QR codes + labels in a grid layout

#### Scenario: Partial batch with missing items
- GIVEN itemIds `["item-1", "nonexistent", "item-3"]`
- WHEN batch QR sheet is requested
- THEN only QR codes for `item-1` and `item-3` are rendered; `nonexistent` is silently skipped

### Requirement: Print-ready output (QR-003)

QR codes MUST render at minimum 300 DPI equivalent. Batch sheets MUST include print margins and cut lines. QR error correction SHALL default to level M (15% damage recovery).

#### Scenario: High-resolution QR for printing
- GIVEN an item requiring a print label
- WHEN QR is generated with `?size=600`
- THEN the output is a 600x600px PNG suitable for 2-inch label printing

### Requirement: QR URL format (QR-004)

The QR-encoded URL MUST follow the pattern `{BASE_URL}/p/{projectSlug}/i/{itemSlug}`. URL MUST NOT contain session tokens, API keys, or secrets.

#### Scenario: QR scans to item detail
- GIVEN QR code for item with slug `industrial-pump` in project `plant-a`
- WHEN scanned with any QR reader
- THEN the decoded URL navigates to the item's public detail page

### Requirement: Error handling for non-existent items (QR-005)

Invalid item references MUST return `404`. Invalid format parameters MUST return `400`. The response MUST include a non-leaking error message.
