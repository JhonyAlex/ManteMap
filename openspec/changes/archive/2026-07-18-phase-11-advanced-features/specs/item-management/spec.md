# Delta for Item Management

## ADDED Requirements

### Requirement: QR code display on item detail

The item detail page MUST include a "Show QR" button that displays the item's QR code in a modal/dialog. The QR image SHALL be fetched from the QR generation API. A "Print QR" action MUST trigger browser print for the QR code only.

#### Scenario: Open QR modal from item detail
- GIVEN an item detail page for "Pump A"
- WHEN the user clicks "Show QR"
- THEN a modal displays the QR code image (from API) with item name label beneath it

#### Scenario: Print QR from modal
- GIVEN the QR modal is open
- WHEN the user clicks "Print QR"
- THEN the browser print dialog opens with only the QR code + label visible

#### Scenario: QR unavailable handles gracefully
- GIVEN the QR API returns an error
- WHEN the user clicks "Show QR"
- THEN the modal shows "QR code unavailable" with a retry button

### Requirement: PDF export action on item detail

The item detail page MUST include a "Export PDF" button that triggers download of the item sheet PDF. The download SHALL be initiated via the PDF export API route. While downloading, the button MUST show a loading state.

#### Scenario: Export PDF from item detail
- GIVEN an item detail page
- WHEN the user clicks "Export PDF"
- THEN the browser downloads a PDF file named `{item-slug}.pdf` with the item sheet content

#### Scenario: PDF download loading state
- GIVEN the user clicks "Export PDF"
- WHEN the PDF is being generated server-side
- THEN the button shows a spinner and is disabled until download starts
