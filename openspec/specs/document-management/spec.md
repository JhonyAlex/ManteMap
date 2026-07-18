# Document Management Specification

## Purpose

File attachments on items with version history and expiration tracking for industrial document workflows.

## Requirements

### Requirement: Document Upload

The system SHALL allow project members to upload files attached to items via multipart form data. Each upload creates a document with an initial version.

| Constraint | Value |
|-----------|-------|
| Max size | 50 MB |
| Types | pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, csv, txt, dwg, dxf |

#### Scenario: Successful upload

- GIVEN an authenticated user with project access
- WHEN they upload a valid file to an item
- THEN a Document and DocumentVersion (v1) are created
- AND the file is stored via the configured StorageDriver

#### Scenario: Reject oversized file

- GIVEN max file size is 50 MB
- WHEN a 75 MB file is uploaded
- THEN the system rejects with a validation error

#### Scenario: Reject disallowed type

- GIVEN allowed types include pdf and png
- WHEN a .exe is uploaded
- THEN the system rejects with a validation error

### Requirement: Document Versioning

Each new upload to an existing document SHALL create an immutable version record. Document.currentVersionId SHALL point to the latest.

#### Scenario: Upload new version

- GIVEN a document with 2 versions
- WHEN a user uploads a new file
- THEN v3 is created, currentVersionId updates, v1–v2 remain unchanged

#### Scenario: View version history

- GIVEN a document with 3 versions
- WHEN version history is requested
- THEN all versions return ordered desc by number with timestamp, size, uploader

### Requirement: Document CRUD

CRUD operations for documents scoped to items. All operations SHALL enforce project-scoped access control.

#### Scenario: List documents

- GIVEN an item with 5 documents
- WHEN a project member requests the list
- THEN all 5 documents return with current version metadata

#### Scenario: Delete document

- GIVEN a document with 3 versions on filesystem
- WHEN an authorized user deletes it
- THEN DB record and ALL files are removed transactionally (no orphans)

#### Scenario: Update metadata

- GIVEN an existing document
- WHEN name or description is updated
- THEN metadata changes without creating a new version

### Requirement: Expiration Tracking

Optional `expiresAt` on documents. Visual indicators on item detail page.

| Indicator | Condition |
|-----------|-----------|
| Red (expired) | expiresAt < now |
| Yellow (expiring) | expiresAt within 30 days |
| None | null or > 30 days |

#### Scenario: Expired document

- GIVEN expiresAt in the past
- WHEN item detail is viewed
- THEN red expired badge displays

#### Scenario: Expiring soon

- GIVEN expiresAt in 15 days
- WHEN item detail is viewed
- THEN yellow expiring-soon badge displays

#### Scenario: No expiration

- GIVEN expiresAt = null
- WHEN item detail is viewed
- THEN no indicator shown

### Requirement: Storage Abstraction

StorageDriver interface for all file operations. MVP: LocalStorageDriver. Interface supports future S3 swap.

#### Scenario: Store locally

- GIVEN STORAGE_DRIVER=local, STORAGE_LOCAL_PATH=./storage
- WHEN a file is uploaded
- THEN it writes to the local filesystem path

#### Scenario: Retrieve file

- GIVEN a stored document version
- WHEN download is requested
- THEN file serves via StorageDriver with correct content type

### Requirement: API Routes

Routes under `/api/projects/{projectId}/items/{itemId}/documents/`. Authentication and project membership enforced.

#### Scenario: Unauthorized access

- GIVEN an unauthenticated request
- WHEN hitting any document route
- THEN 401 is returned

#### Scenario: Cross-project denied

- GIVEN a user in project A only
- WHEN accessing project B item documents
- THEN 403 is returned
