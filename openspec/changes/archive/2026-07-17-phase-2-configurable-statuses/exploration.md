## Exploration: Configurable Statuses per ItemType

### Current State

The system has ItemType CRUD (Slice 1) and DynamicField definitions (Slice 2). The Prisma schema has no Status model yet. The shared types package already defines a forward-looking `ItemStatus` interface (`packages/shared/src/types/domain.ts:4-13`) with: `id`, `name`, `code`, `color`, `icon`, `isInitial`, `isFinal`, `isBlocking`, `isIncident`. No code depends on this type yet, so it can be refined.

The existing architecture follows a layered pattern for every domain entity:
- **Prisma model** in `packages/database/prisma/schema.prisma` with FK to parent, `@@unique`, `@@index`, and `onDelete: Cascade`
- **Shared types** in `packages/shared/src/types/domain.ts`
- **Zod schemas** in `packages/validation/src/<entity>.ts` (create + update schemas)
- **Repository** in `apps/web/src/lib/repositories/<entity>-repository.ts` with `verifyItemTypeInProject` pattern
- **Service** in `apps/web/src/lib/services/<entity>-service.ts` with `requireProjectMember`/`requireProjectOwner` guards
- **API routes** nested under `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/<entity>s/`

ADR-006 (Dynamic Field Model) establishes the relational model with FK to ItemType as the preferred approach. ADR-002 (Dynamic Fields) decided on normalized definitions + JSONB values. Both serve as architectural precedent.

### Affected Areas

- `packages/database/prisma/schema.prisma` — new `Status` model to be added
- `packages/shared/src/types/domain.ts` — refine existing `ItemStatus` interface (add `order`, rename `isInitial` → `isDefault`, keep `isFinal`/`isBlocking`/`isIncident` as deferred fields)
- `packages/validation/src/` — new `status.ts` Zod schemas + tests
- `packages/validation/src/index.ts` — barrel export
- `apps/web/src/lib/repositories/` — new `status-repository.ts`
- `apps/web/src/lib/services/` — new `status-service.ts`
- `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/` — new API routes
- `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/[statusId]/route.ts` — individual CRUD
- `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/reorder/route.ts` — reorder endpoint
- `packages/database/prisma/schema.prisma` — must add `statuses Status[]` relation to `ItemType` model

### Design Decisions

#### 1. Data model: Relational table with FK to ItemType

Following the ADR-006 pattern. A `Status` Prisma model with `itemTypeId` FK, `onDelete: Cascade`. One-to-many from ItemType.

**Rejected alternatives**:
- Shared statuses across ItemTypes (many-to-many) — over-engineered for current scope; each item type domain has different state semantics
- JSONB array on ItemType — poor queryability, violates ADP-006 pattern

#### 2. Properties

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String @id cuid() | Primary key |
| `itemTypeId` | String FK | Parent ItemType |
| `name` | String | Display name ("Operativo", "En Mantenimiento") |
| `code` | String | Machine-readable key, unique per ItemType |
| `color` | String | Hex color for UI badges |
| `icon` | String? | Optional icon/emoji |
| `order` | Int default(0) | Display ordering |
| `isDefault` | Boolean default(false) | Initial status for new items |
| `active` | Boolean default(true) | Soft-delete flag |
| `createdAt` | DateTime | Audit |
| `updatedAt` | DateTime | Audit |

**Deferred fields** (present in shared type, no logic yet):
- `isFinal`: terminal state (no further transitions)
- `isBlocking`: prevents item operations while active
- `isIncident`: marks incident/problem state

These fields would support status transition rules (Slice N, future enhancement). Including them in the schema now avoids a migration later.

#### 3. Relationship: One-to-many

```
ItemType 1 ──── * Status
```

`onDelete: Cascade` ensures deleting an ItemType removes its statuses. No shared statuses across item types.

#### 4. Authorization

Same pattern as DynamicField:
- **Reads** (list, get): `requireProjectMember(projectId, userId)`
- **Mutations** (create, update, delete, reorder): `requireProjectOwner(projectId, userId)`
- Non-members (including ADMIN): receive `404`
- Non-owner members: receive `403`

#### 5. API surface

Nested under ItemType, same URL pattern as DynamicField:

```
GET    /projects/:projectId/item-types/:itemTypeId/statuses        — list active statuses
POST   /projects/:projectId/item-types/:itemTypeId/statuses        — create
GET    /projects/:projectId/item-types/:itemTypeId/statuses/:id    — get one
PATCH  /projects/:projectId/item-types/:itemTypeId/statuses/:id    — update
DELETE /projects/:projectId/item-types/:itemTypeId/statuses/:id    — soft-delete
PUT    /projects/:projectId/item-types/:itemTypeId/statuses/reorder — reorder
```

#### 6. Default status (`isDefault`)

Boolean column on Status. When a new status is created with `isDefault: true`, the service MUST unset any previous default for that ItemType in a transaction.

Enforcement: service layer. Could later be reinforced with a partial index (`WHERE "isDefault" = true`), but this adds DB-specific complexity. Service-layer enforcement is sufficient and consistent with the project's approach.

#### 7. Transition rules

**Deferred out of scope for Slice 3.** The `isFinal`, `isBlocking`, `isIncident` fields are added to the schema as passive metadata only. A future slice can:
- Add a `StatusTransitionRule` table (from_status, to_status, allowed boolean)
- Use `isFinal`/`isBlocking`/`isIncident` to derive transition constraints
- Add `/statuses/:id/transitions` endpoint

This keeps Slice 3 focused and deliverable.

#### 8. Scope

Per project through ItemType (transitive scoping). The `verifyItemTypeInProject` pattern from `dynamic-field-repository.ts` will be reused verbatim:
1. Verify the ItemType belongs to the project
2. All subsequent queries use `where: { itemTypeId, ... }`

#### 9. Deletion

Soft delete (`active: false`) following the DynamicField pattern. Deleted statuses are excluded from list queries. Mutating a deactivated status returns `404`. Items referencing a deactivated status retain the reference; the UI handles display gracefully (e.g., strikethrough or "Archived" badge).

A future migration will need a FK constraint from `Item.statusId → Status.id`. When that FK exists and a status is deactivated, items with that status remain valid (statuses are not cascade-deleted).

#### 10. Color format

Hex colors (`#RRGGBB`), validated with the same regex pattern as ItemType's `color` field:
```typescript
z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a six-digit hexadecimal value')
```

No predefined palette — free text validation allows any valid hex color.

### Prisma Model (sketch)

```prisma
model Status {
  id          String   @id @default(cuid())
  itemTypeId  String
  name        String
  code        String
  color       String
  icon        String?
  order       Int      @default(0)
  isDefault   Boolean  @default(false)
  active      Boolean  @default(true)
  isFinal     Boolean  @default(false)
  isBlocking  Boolean  @default(false)
  isIncident  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  itemType ItemType @relation(fields: [itemTypeId], references: [id], onDelete: Cascade)

  @@unique([itemTypeId, code])
  @@index([itemTypeId, order])
  @@map("statuses")
}
```

`ItemType` model update:
```prisma
model ItemType {
  // ...existing fields...
  statuses Status[]  // add this relation
}
```

### Shared Type Update

The existing `ItemStatus` interface in `domain.ts` needs minor adjustments:
- Add `order: number`
- Add `active: boolean`
- Rename `isInitial` → `isDefault` (clearer semantics, matches Prisma)

```typescript
export interface ItemStatus {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  order: number;
  isDefault: boolean;
  active: boolean;
  isFinal: boolean;
  isBlocking: boolean;
  isIncident: boolean;
}
```

### Recommendation

**Approach: Relational Status model with one-to-many from ItemType.** This is the only approach consistent with the existing architecture. It mirrors DynamicField exactly in pattern (FK, soft-delete, order, nested routes, auth).

Key implementation points:
1. New `Status` Prisma model with 11 fields + relations
2. Add `statuses Status[]` relation to `ItemType`
3. Update `ItemStatus` shared type
4. New Zod schemas (`createStatusSchema`, `updateStatusSchema`, `reorderStatusesSchema`)
5. New repository with `verifyItemTypeInProject` pattern
6. New service with owner-only mutation guard
7. Standard nested API routes (list, create, get, update, delete, reorder)
8. Service-layer enforcement of single `isDefault` per ItemType

**Effort**: Medium (comparable to DynamicField slice — 6 files + tests + schema migration)

### Risks

- Naming collision: Prisma model `Status` could be confused with the existing `ItemTypeStatus` enum (ACTIVE/ARCHIVED). Mitigation: `ItemTypeStatus` is for the ItemType's own lifecycle status, `Status` is for items within that type. Different domains; documentation clarifies.
- `isDefault` uniqueness: Without a DB constraint, race conditions could create multiple defaults. Mitigation: use a Prisma transaction (`$transaction`) to unset previous default before creating a new one.
- N+1 loading: Including `statuses` in ItemType list queries would cause N+1. Mitigation: include statuses only on GET individual ItemType, not on list (same pattern as DynamicField).
- Color validation: Hex regex allows valid hex but not semantic color validation. Mitigation: UI can provide a color picker constrained to valid hex values.
- Future FK from Item to Status: When Phase 3 adds items, the status_id FK must handle deactivated/deleted statuses gracefully. Mitigation: soft-delete preserves the record; items keep their status reference.

### Ready for Proposal

**Yes.** The design follows established patterns precisely. The main decision is whether to include `isFinal`/`isBlocking`/`isIncident` now as passive columns or defer them entirely. Recommendation: include them now (zero cost, avoids migration later) but exclude them from the Zod schemas and API surface.
