# Design: Phase 5 — Document Management

## Technical Approach

Layered architecture following existing service/repository patterns. New `Document` and `DocumentVersion` Prisma models provide versioned file metadata. `StorageDriver` interface abstracts file persistence with `LocalStorageDriver` for MVP. Upload uses multipart form data via Next.js App Router. Document CRUD is nested under items, reusing project-scoped auth guards.

## Architecture Decisions

### Decision: Storage Abstraction

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Direct fs calls | Simple but locks to local, untestable | No |
| StorageDriver interface | One extra layer, enables S3 swap later | **Yes** |

**Rationale**: `.env.example` already defines `STORAGE_DRIVER` and S3 vars. Interface + local driver matches the proposal's S3-ready requirement without overengineering.

### Decision: Versioning Model

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline version fields on Document | Simple but loses history | No |
| Separate DocumentVersion table | Full history, one extra join | **Yes** |

**Rationale**: Industrial environments audit file changes. `DocumentVersion` is immutable once created; `Document.currentVersionId` points to the latest. Each upload creates a new version.

### Decision: Multipart Parsing

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Native Request.formData() | Zero deps, Next.js 15 native | **Yes** |
| busboy/multer | More features, extra dependency | No |

**Rationale**: Next.js 15 App Router handles multipart via native `Request.formData()`. No additional dependency needed for MVP file size limits.

### Decision: File Path Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat with cuid names | Simple, no collision risk | No |
| Hierarchical `{projectId}/{itemId}/{versionId}-{filename}` | Traceable, organized | **Yes** |

**Rationale**: Hierarchical paths enable future per-project storage quotas and easier debugging. Version ID in filename prevents collisions on concurrent uploads.

## Data Flow

```
Browser (multipart form)
  │
  ▼
POST /api/projects/{pid}/items/{iid}/documents
  │  getAuthUser() → requireProjectMember()
  │  parse FormData → validate (Zod) → validate file type/size
  │
  ▼
DocumentService.upload()
  │  1. StorageDriver.writeFile(buffer, path)
  │  2. Prisma transaction: create Document + DocumentVersion
  │
  ▼
Response: { document, version }
```

**Download flow**:
```
GET /api/projects/{pid}/items/{iid}/documents/{did}/download
  │  getAuthUser() → requireProjectMember()
  │  find DocumentVersion → StorageDriver.readFile(path)
  │
  ▼
Response: file stream with Content-Type + Content-Disposition
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Add Document, DocumentVersion models + enums |
| `apps/web/src/lib/storage/storage-driver.ts` | Create | StorageDriver interface |
| `apps/web/src/lib/storage/local-storage-driver.ts` | Create | LocalStorageDriver implementation |
| `apps/web/src/lib/storage/index.ts` | Create | Barrel export + factory |
| `apps/web/src/lib/repositories/document-repository.ts` | Create | Prisma data access for documents |
| `apps/web/src/lib/services/document-service.ts` | Create | Upload, list, delete, download logic |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/route.ts` | Create | GET (list), POST (upload) |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/[documentId]/route.ts` | Create | GET (single), DELETE |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/[documentId]/download/route.ts` | Create | GET file stream |
| `packages/validation/src/document.ts` | Create | Zod schemas for document operations |
| `apps/web/src/hooks/use-documents.ts` | Create | TanStack Query hooks |
| `apps/web/src/components/items/documents/document-list.tsx` | Create | Document list with expiration badges |
| `apps/web/src/components/items/documents/upload-dialog.tsx` | Create | Upload form dialog |
| `apps/web/src/components/items/documents/version-history.tsx` | Create | Version timeline component |

## Interfaces / Contracts

```typescript
// apps/web/src/lib/storage/storage-driver.ts
export interface StorageDriver {
  writeFile(buffer: Buffer, relativePath: string): Promise<string>;
  readFile(relativePath: string): Promise<Buffer>;
  deleteFile(relativePath: string): Promise<void>;
  fileExists(relativePath: string): Promise<boolean>;
}

// packages/database/prisma/schema.prisma (new models)
model Document {
  id              String          @id @default(cuid())
  itemId          String
  name            String
  mimeType        String
  sizeBytes       Int
  expiresAt       DateTime?
  currentVersionId String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  item            Item            @relation(fields: [itemId], references: [id], onDelete: Cascade)
  currentVersion  DocumentVersion? @relation(fields: [currentVersionId], references: [id])
  versions        DocumentVersion[]

  @@index([itemId])
  @@index([expiresAt])
  @@map("documents")
}

model DocumentVersion {
  id          String          @id @default(cuid())
  documentId  String
  version     Int
  fileName    String
  mimeType    String
  sizeBytes   Int
  storagePath String
  uploadedBy  String
  createdAt   DateTime        @default(now())

  document    Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user        User            @relation(fields: [uploadedBy], references: [id])

  @@unique([documentId, version])
  @@index([documentId])
  @@map("document_versions")
}

// packages/validation/src/document.ts
export const uploadDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  expiresAt: z.string().datetime().optional(),
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | StorageDriver read/write/delete, validation schemas | Vitest, mock fs |
| Unit | DocumentService upload/list/delete logic | Vitest, mock repo + storage |
| Integration | DocumentRepository CRUD with Prisma | Vitest + Prisma mock |
| Integration | API routes (upload multipart, list, delete, download) | Vitest + mock session |
| Component | DocumentList, UploadDialog, VersionHistory | Vitest + React Testing Library |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. Add Document/DocumentVersion to Prisma schema
2. Run `prisma db push` for development (production blocked by ADR-005 baseline)
3. Create storage directory (`./storage`) — add to `.gitignore`
4. No feature flag needed — documents are a new domain with no existing consumers

## Open Questions

- [ ] Should document deletion be hard-delete or soft-delete (status field)?
- [ ] Max file count per item — enforce limit or leave unlimited for MVP?
