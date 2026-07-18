# Delta for Document Expiration Events

## ADDED Requirements

### Requirement: Expiration Alert Generation

The system SHALL generate alerts when a document's `expiresAt` field changes. Alerts SHALL fire for expirations within 30, 14, 7, and 1 days. Generation MUST be idempotent via the alert unique constraint.

#### Scenario: Alert generated on expiresAt change

- GIVEN a document with expiresAt=null
- WHEN expiresAt is set to a date 10 days from now
- THEN a warning-severity alert is generated with alertType=document_expiration

#### Scenario: No alert for distant expiration

- GIVEN a document
- WHEN expiresAt is set to a date 60 days from now
- THEN no alert is generated (beyond 30-day threshold)

### Requirement: Expiration Scan Integration

The alert scan endpoint SHALL evaluate all documents with non-null `expiresAt` and generate/update alerts for those within 30/14/7/1 day thresholds.

#### Scenario: Scan catches upcoming expirations

- GIVEN documents expiring in 14 days and 2 days
- WHEN the alert scan endpoint is called
- THEN alerts are generated or updated for both documents
