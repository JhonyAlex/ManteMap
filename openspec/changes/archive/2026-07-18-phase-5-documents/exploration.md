## Exploration: Phase 5 — Document Management

### Current State

ManteMap currently has:
- **Item CRUD** complete (Phase 3+4) with Prisma models: `Item`, `ItemType`, `DynamicField`, `ItemFieldValue`, `Status`
- **No Document model** exists in Prisma schema
- **No file upload infrastructure** implemented
- **Storage configuration** exists in `.env.example` with `STORAGE_DRIVER` (local/s3) and S3 settings
- **Deferred field types** FILE and IMAGE in DynamicField registry (placeholder components)
- **ROADMAP.md** describes Phase 4 (Documentos): "Subida de archivos, Metadatos de documentos, Vencimientos, Versiones iniciales"

The system currently supports items with dynamic fields but cannot handle file attachments or document versioning.

### Affected Areas

- `packages/database/prisma/schema.prisma` — New Document and DocumentVersion models
- `apps/web/src/lib/services/` — New document-service.ts for business logic
- `apps/web/src/lib/repositories/` — New document-repository.ts for data access
- `apps/web/src/app/api/projects/[projectId]/items/[itemId]/documents/` — New API routes for upload/list
- `apps/web/src/components/items/` — Document list component on item detail page
- `apps/web/src/hooks/` — New use-documents.ts for TanStack Query hooks
- `packages/validation/src/` — New document validation schemas
- `apps/web/src/lib/storage/` — New storage abstraction layer (local/S3)
- `apps/web/src/lib/auth/` — Session handling for file uploads

### Approaches

1. **Local Filesystem with Abstracted Storage Layer**
   - Store files in `./storage` directory (configured via `STORAGE_LOCAL_PATH`)
   - Create storage abstraction with `LocalStorageDriver` and `S3StorageDriver`
   - Metadata stored in PostgreSQL, files on disk
   - Pros: Simple, no external dependencies, works offline, easy debugging
   - Cons: Not scalable for production, backup complexity, single-server limitation
   - Effort: Low-Medium

2. **S3-Compatible Object Storage (Primary)**
   - Use S3 API (AWS S3, MinIO, DigitalOcean Spaces)
   - Same abstraction layer, just different driver configuration
   - Pros: Scalable, production-ready, CDN integration, versioning built-in
   - Cons: Requires external service, cost, complexity for development
   - Effort: Medium

3. **Database Blob Storage**
   - Store file content directly in PostgreSQL as BYTEA or Large Object
   - Pros: Single system, ACID transactions, no separate storage
   - Cons: Database bloat, poor performance for large files, backup complexity
   - Effort: Low

**Recommended**: **Option 1 (Local) with abstraction for Option 2 (S3)** — Start with local storage for MVP, design abstraction that allows S3 later. This matches the existing `STORAGE_DRIVER` configuration pattern.

4. **Versioning Strategy: Simple Version Number**
   - Document table has `version` integer field
   - New upload increments version, old file retained
   - Pros: Simple, predictable, easy to implement
   - Cons: No metadata per version, limited history
   - Effort: Low

5. **Versioning Strategy: Full Version History**
   - Separate `DocumentVersion` table storing each version as immutable record
   - Each version has its own file reference, metadata, timestamps
   - Pros: Complete audit trail, can restore any version, version-specific metadata
   - Cons: More complex queries, storage overhead, requires careful UI design
   - Effort: Medium

**Recommended**: **Option 5 (Full Version History)** — Required for compliance and audit trails in industrial environments.

6. **Expiration Notification: On-Demand Check**
   - Check expiration dates when user loads item detail
   - Show badges/warnings for expiring documents
   - Pros: Simple, no background jobs, real-time
   - Cons: No proactive notifications, relies on user checking
   - Effort: Low

7. **Expiration Notification: Scheduled Background Job**
   - Cron job or scheduled function checks daily for expiring documents
   - Sends email/in-app notifications (requires email service)
   - Pros: Proactive alerts, compliance guarantees
   - Cons: Requires job scheduler, email service, more complex
   - Effort: Medium-High

**Recommended**: **Option 6 (On-Demand) for MVP**, with Option 7 as future enhancement. Focus on visual indicators in UI first.

### Recommendation

**Storage**: Local filesystem with S3-ready abstraction (matches existing config)
**Versioning**: Full version history with DocumentVersion model
**Expiration**: On-demand visual indicators, scheduled notifications later

This approach balances MVP simplicity with production readiness, leveraging existing `STORAGE_DRIVER` configuration and providing clear upgrade path.

### Risks

- **File size limits**: Need to enforce limits (e.g., 50MB per file) to prevent abuse
- **Concurrent uploads**: Race conditions when multiple users upload to same item
- **Storage cleanup**: Orphaned files when documents deleted (need cleanup strategy)
- **Backup complexity**: Local files need separate backup from database
- **Production deployment**: Local storage not suitable for multi-server deployment

### Ready for Proposal

**Yes** — The exploration identifies clear approaches with tradeoffs. The orchestrator should:
1. Confirm storage strategy (local with S3 abstraction)
2. Confirm versioning strategy (full history)
3. Confirm expiration approach (on-demand for MVP)
4. Proceed to proposal phase with these decisions

The existing `STORAGE_DRIVER` configuration suggests the team already anticipated this architecture.