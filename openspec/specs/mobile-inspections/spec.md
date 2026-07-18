# Mobile Inspections Specification

## Purpose

Camera-based QR scanning with mobile-optimized item views for on-site maintenance inspections, including audit logging via the Inspection model.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| MI-001 | Camera QR scanning with `html5-qrcode` | MUST |
| MI-002 | QR scan navigates to item detail | MUST |
| MI-003 | Mobile-optimized inspection view | MUST |
| MI-004 | Inspection audit logging | MUST |
| MI-005 | Camera unavailability fallback | SHOULD |
| MI-006 | Camera permission handling | MUST |

### Requirement: Camera QR scanning (MI-001)

The system MUST provide a QR scanner component using `html5-qrcode` that activates the device camera. The scanner SHALL continuously scan until a valid QR code is detected. The scanner MUST stop when a match is found or the user navigates away.

#### Scenario: Scan valid ManteMap QR code
- GIVEN a mobile device with camera permission granted
- WHEN the user points the camera at a ManteMap QR code
- THEN the scanner decodes the URL and navigates to the item within 3 seconds

#### Scenario: Scan non-ManteMap QR code
- GIVEN a camera scanning a QR code with an external URL
- WHEN the QR is decoded
- THEN the scanner shows "Not a ManteMap QR code" and continues scanning

### Requirement: QR-to-item navigation (MI-002)

Decoded ManteMap QR URLs MUST resolve to the correct item and project. Navigation SHALL open the mobile-optimized item detail view. Invalid or tampered URLs MUST show an error message.

#### Scenario: QR opens correct item
- GIVEN QR encodes `/p/plant-a/i/industrial-pump`
- WHEN scanned
- THEN the mobile view renders item "Industrial Pump" with status, field values, and documents

### Requirement: Mobile-optimized item view (MI-003)

The item detail view on mobile MUST render with touch-friendly tap targets (min 44px), stacked layout (not side-by-side), and a prominent status transition button. The view SHALL include: item name, current status, field values, document list, and a "Log Inspection" button.

#### Scenario: Mobile view renders inspection-ready
- GIVEN an item "Fire Extinguisher #3" on a 375px-wide device
- WHEN the item detail loads
- THEN all interactive elements are ≥44px tall, content stacks vertically, and status dropdown is full-width

### Requirement: Inspection audit log (MI-004)

The system MUST create an `Inspection` record on each logged inspection with: `itemId`, `userId`, `statusId` (optional), `notes` (optional), and `createdAt`. Inspection records SHALL be queryable per item and per user.

#### Scenario: Log inspection with status change
- GIVEN item "Pump A" with status "Operational"
- WHEN inspector logs inspection with status "Needs Maintenance" and note "Bearing noise detected"
- THEN an Inspection record is created with the status, note, and timestamp

#### Scenario: Log inspection without status change
- GIVEN item "Pump A" with status "Operational"
- WHEN inspector logs inspection with note "All clear" but no status change
- THEN an Inspection record is created with null statusId and the note

### Requirement: Camera fallback (MI-005)

The system SHOULD provide a manual item lookup fallback when the camera is unavailable or unsupported. The fallback SHALL be a search field that filters items by slug or display name.

#### Scenario: Camera unavailable on desktop
- GIVEN a browser without camera support
- WHEN the inspection page loads
- THEN a search input field is displayed instead of the camera view
