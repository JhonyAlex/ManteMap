# Tasks: Phase 5 — Document Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (API + Service) → PR 3 (UI + Integration) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema + validation + storage driver | PR 1 | `pnpm test --filter @mantemap/database --filter @mantemap/validation` + storage unit tests | N/A — pure types/infra, no runtime endpoint | Remove `Document`/`DocumentVersion` from schema, delete `src/lib/storage/`, remove `document.ts` from validation |
| 2 | Repository + service + API routes | PR 2 | `pnpm test` (service + repo + API integration tests) | `POST /api/projects/{pid}/items/{iid}/documents` with multipart curl | Delete `document-service.ts`, `document-repository.ts`, API route dirs |
| 3 | Hooks + UI components + item integration | PR 3 | `pnpm test` (component tests for DocumentList, UploadDialog, VersionHistory) | Navigate to item detail page, verify document list renders | Delete `src/components/items/documents/`, `use-documents.ts`, remove document section from item detail |

## Phase 1: Foundation (PR 1 — base)

- [x] 1.1 RED: Write Zod schema tests in `packages/validation/src/document.test.ts` — upload schema rejects >50MB, rejects `.exe`, accepts valid types, accepts optional `expiresAt`
- [x] 1.2 GREEN: Create `packages/validation/src/document.ts` — `uploadDocumentSchema` (name, expiresAt), `documentFilterSchema`
- [x] 1.3 REFACTOR: Export from `packages/validation/src/index.ts`
- [x] 1.4 RED: Write storage driver unit tests in `apps/web/src/lib/storage/local-storage-driver.test.ts` — writeFile, readFile, deleteFile, fileExists, error on missing file
- [x] 1.5 GREEN: Create `apps/web/src/lib/storage/storage-driver.ts` — `StorageDriver` interface
- [x] 1.6 GREEN: Create `apps/web/src/lib/storage/local-storage-driver.ts` — `LocalStorageDriver` using `fs/promises`, hierarchical path `{projectId}/{itemId}/{versionId}-{filename}`
- [x] 1.7 GREEN: Create `apps/web/src/lib/storage/index.ts` — barrel export + `getStorageDriver()` factory from `STORAGE_DRIVER` env
- [x] 1.8 REFACTOR: Verify storage tests pass, add `.gitignore` entry for `./storage`
- [x] 1.9 Add `Document` and `DocumentVersion` models to `packages/database/prisma/schema.prisma` — cascade deletes, indexes on `itemId` and `expiresAt`, unique `[documentId, version]`
- [x] 1.10 Run `prisma db push` for local dev, verify schema compiles

## Phase 2: API + Service (PR 2 — targets PR 1 branch)

- [x] 2.1 RED: Write repository tests in `apps/web/src/lib/repositories/document-repository.test.ts` — createDocument, findByItem, findById, deleteDocument (cascades versions + files), incrementVersion
- [x] 2.2 GREEN: Create `apps/web/src/lib/repositories/document-repository.ts` — CRUD functions following item-repository pattern, Prisma client injection seam
- [x] 2.3 RED: Write service tests in `apps/web/src/lib/services/document-service.test.ts` — upload (validates + stores + creates doc+version), list by item, delete (DB + files transactional), download (returns buffer + mime), version history
- [x] 2.4 GREEN: Create `apps/web/src/lib/services/document-service.ts` — upload, listDocuments, getDocument, deleteDocument, downloadDocument, getVersionHistory
- [x] 2.5 RED: Write API route tests in `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/route.test.ts` — POST upload 401, 403 (cross-project), 201 success, GET list 200; `.../documents/[documentId]/route.test.ts` — GET single 200, DELETE 200; `.../download/route.test.ts` — GET file stream 200 with correct headers
- [x] 2.6 GREEN: Create `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/route.ts` — GET (list), POST (upload via `Request.formData()`)
- [x] 2.7 GREEN: Create `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/[documentId]/route.ts` — GET (single), DELETE
- [x] 2.8 GREEN: Create `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/[documentId]/download/route.ts` — GET file stream with Content-Type + Content-Disposition
- [x] 2.9 REFACTOR: Verify all API tests pass, consistent error shape `{ data?, error?, message? }`

## Phase 3: UI + Integration (PR 3 — targets PR 2 branch)

- [x] 3.1 RED: Write hook tests in `apps/web/src/hooks/use-documents.test.ts` — useDocuments returns list, useUploadDocument calls POST, useDeleteDocument calls DELETE, invalidation on success
- [x] 3.2 GREEN: Create `apps/web/src/hooks/use-documents.ts` — TanStack Query hooks, `documentKeys` factory, optimistic updates
- [x] 3.3 RED: Write component tests for DocumentList — renders documents, shows expired (red) badge, expiring-soon (yellow) badge, no badge when null, empty state
- [x] 3.4 GREEN: Create `apps/web/src/components/items/documents/document-list.tsx` — table with name, size, version, expiration badge, download/delete actions
- [x] 3.5 RED: Write component tests for UploadDialog — validates file type/size client-side, submits multipart form, shows errors
- [x] 3.6 GREEN: Create `apps/web/src/components/items/documents/upload-dialog.tsx` — dialog with file input, name field, optional expiresAt, multipart submit
- [x] 3.7 RED: Write component tests for VersionHistory — renders versions ordered desc, shows timestamp/size/uploader
- [x] 3.8 GREEN: Create `apps/web/src/components/items/documents/version-history.tsx` — timeline list of versions
- [x] 3.9 REFACTOR: Verify all component tests pass (target: 25+ new tests)
- [x] 3.10 Integrate document list into item detail page — add Documents section below existing content
- [x] 3.11 Run full suite: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
