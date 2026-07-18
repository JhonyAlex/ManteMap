# Proposal: Phase 5 — Document Management

## Intent

ManteMap items have no file attachment capability. Industrial environments require document management with version history and expiration tracking. This change adds document upload, versioning, and expiration indicators to items.

## Scope

### In Scope
- Document and DocumentVersion Prisma models
- Storage abstraction layer (local filesystem, S3-ready)
- File upload API with size/type validation
- Document CRUD API routes under items
- Document list component on item detail page
- Version history viewing
- Expiration date with on-demand visual indicators

### Out of Scope
- Scheduled expiration notifications (email/background jobs)
- S3 driver implementation (abstraction only, local driver for MVP)
- FILE/IMAGE DynamicField type activation
- Bulk upload
- Document search/indexing
- PDF preview/thumbnail generation

## Capabilities

### New Capabilities
- `document-management`: Document CRUD, upload, version history, expiration tracking per item

### Modified Capabilities
- None (documents are a new domain, no existing spec changes)

## Approach

**Storage**: Local filesystem via `LocalStorageDriver` implementing `StorageDriver` interface. Files stored in `STORAGE_LOCAL_PATH` (default `./storage`). S3 driver interface defined but not implemented.

**Versioning**: Full version history with `DocumentVersion` model. Each upload creates an immutable version record. Current version tracked via `currentVersionId` FK on Document.

**Expiration**: `expiresAt` nullable field on Document. On-demand badge/warning rendering when viewing item detail. No background jobs.

**API**: Nested routes under `/api/projects/{projectId}/items/{itemId}/documents/`. Upload via multipart form data. Project-scoped access control reusing existing auth patterns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | New | Document, DocumentVersion models, enums |
| `apps/web/src/lib/storage/` | New | StorageDriver interface, LocalStorageDriver |
| `apps/web/src/lib/services/document-service.ts` | New | Upload, version, expiration logic |
| `apps/web/src/lib/repositories/document-repository.ts` | New | Prisma data access layer |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/` | New | CRUD + upload routes |
| `apps/web/src/components/items/documents/` | New | Document list, version history, upload form |
| `apps/web/src/hooks/use-documents.ts` | New | TanStack Query hooks |
| `packages/validation/src/document.ts` | New | Zod schemas for document operations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| File size abuse | Med | 50MB limit enforced in validation + API |
| Orphaned files on delete | Med | Transactional delete: DB record + file cleanup |
| Concurrent uploads | Low | Last-write-wins with version increment |
| Local storage not production-ready | High | Abstraction layer allows S3 swap later |

## Rollback Plan

1. Remove Document/DocumentVersion models from Prisma schema
2. Run `prisma db push` to drop tables
3. Delete storage directory contents
4. Remove API routes, services, components
5. No existing functionality affected (new domain)

## Dependencies

- Existing STORAGE_DRIVER config in `.env.example`
- Prisma baseline procedure (ADR-005) must be completed first for production deployment

## Success Criteria

- [ ] Document upload stores file on local filesystem and creates DB record
- [ ] Version history tracks all uploads with metadata
- [ ] Expiration indicators display on item detail page
- [ ] Project-scoped access control enforced
- [ ] File size/type validation rejects invalid uploads
- [ ] All new code passes lint, typecheck, and tests
