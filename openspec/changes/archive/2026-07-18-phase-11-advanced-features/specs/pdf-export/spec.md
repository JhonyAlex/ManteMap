# PDF Export Specification

## Purpose

Server-side PDF generation for item sheets using `@react-pdf/renderer`, producing single-page documents with field values, status, location, documents, and QR code.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| PDF-001 | Item sheet PDF generation via API | MUST |
| PDF-002 | Field value rendering in PDF | MUST |
| PDF-003 | QR code inclusion in PDF | SHOULD |
| PDF-004 | Streaming download response | MUST |
| PDF-005 | Error handling for missing items | MUST |

### Requirement: Item sheet PDF generation (PDF-001)

The system MUST expose `GET /api/projects/{projectId}/items/{itemId}/export/pdf` returning a PDF document. The PDF SHALL be a single-page item sheet containing: item name, current status, location path, all field values, document list, and generation timestamp.

#### Scenario: Download PDF for item with all data
- GIVEN item "Pump A" with status "Operational", location "Building 1 > Room 101", 5 field values
- WHEN `GET /api/projects/proj-1/items/pump-a/export/pdf` is called
- THEN a PDF is streamed with `Content-Type: application/pdf` and `Content-Disposition: attachment`

#### Scenario: Missing item returns 404
- GIVEN item `nonexistent` does not exist
- WHEN PDF export endpoint is called
- THEN the API returns `404`

### Requirement: Field value rendering (PDF-002)

The PDF MUST render all item field values with label + value pairs. Values MUST be rendered as plain text. Missing/null values SHALL display as "—". DynamicFields marked `showInList=false` MUST still appear in the PDF.

#### Scenario: All fields rendered in PDF
- GIVEN item with fields: name="Widget" (SHORT_TEXT), quantity=42 (NUMBER), notes=null
- WHEN PDF is generated
- THEN "Name: Widget", "Quantity: 42", and "Notes: —" appear in the document

### Requirement: QR code inclusion (PDF-003)

The PDF SHOULD include the item's QR code in the footer area. If QR generation is unavailable, the QR area SHALL be omitted gracefully without failing the PDF generation.

#### Scenario: PDF includes QR code footer
- GIVEN item with valid QR code generated
- WHEN PDF export runs
- THEN the QR code image appears in the PDF footer alongside the item slug

#### Scenario: PDF generates without QR when unavailable
- GIVEN QR generation service is unavailable
- WHEN PDF export is requested
- THEN the PDF still generates successfully, without the QR code section

### Requirement: Streaming download (PDF-004)

The PDF MUST be generated server-side and streamed to the client as a download. The file MUST NOT be written to disk. Generation errors MUST result in a clean error response, never a partial/corrupt PDF.

#### Scenario: PDF streams directly to client
- GIVEN a valid item
- WHEN PDF export is requested
- THEN the PDF bytes stream to the browser; no file is persisted to server storage

### Requirement: Error handling (PDF-005)

Invalid item references MUST return 404. Internal PDF rendering errors MUST return 500 with a non-leaking error message. The response MUST include a safe `message` field for the client.

#### Scenario: Rendering error returns safe error
- GIVEN a PDF rendering failure (e.g., invalid field data shape)
- WHEN the export endpoint is called
- THEN the API returns `500` with `{ error: "PDF generation failed", message: "An internal error occurred" }`
