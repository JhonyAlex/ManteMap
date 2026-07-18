# Exploration: Phase 3 — Items CRUD

## Current State

ManteMap has completed Phase 0–2. The Prisma schema defines:

- **`ItemType`** — project-scoped type definitions with `name`, `slug`, `description`, `icon`, `color`, `status`. Each ItemType owns DynamicFields and Statuses via cascade.
- **`DynamicField`** — 18 field types (SHORT_TEXT through USER_RELATION), with `key`, `type`, `required`, `defaultValue` (Json), `options` (Json), `validation` (Json), `showInList`, `showInSearch`, `order`, `active`.
- **`Status`** — per-ItemType lifecycle states with `color`, `icon`, `order`, `isDefault`, `isFinal`, `isBlocking`, `isIncident`.

The `DynamicForm` component (`apps/web/src/components/forms/dynamic-form.tsx`) already renders validated forms from `DynamicFieldDefinition[]` using a Zod schema factory and field registry. This is directly reusable for Item create/edit.

**No `Item` model exists yet.** Phase 3 must introduce the central domain object that ties ItemType + DynamicField values + Status together.

## Affected Areas

### New files to create

- `packages/database/prisma/schema.prisma` — add `Item` and `ItemFieldValue` (or `ItemDynamicValue`) models
- `packages/validation/src/item.ts` — Zod schemas for create/update Item
- `packages/shared/src/types/domain.ts` — `Item` TypeScript interface
- `apps/web/src/lib/repositories/item-repository.ts` — data access layer
- `apps/web/src/lib/services/item-service.ts` — business logic
- `apps/web/src/app/api/projects/[projectId]/items/route.ts` — list/create
- `apps/web/src/app/api/projects/[projectId]/items/[itemId]/route.ts` — get/update/delete
- `apps/web/src/components/items/` — ItemList, ItemCard, ItemDetail, ItemForm components

### Files to modify

- `packages/database/prisma/schema.prisma` — add Item model, relations from ItemType/Status
- `packages/validation/src/index.ts` — export item schemas
- `packages/shared/src/types/index.ts` — export Item types
- `apps/web/src/lib/repositories/item-type-repository.ts` — add Item relation to ItemType query
- `apps/web/src/components/layout/sidebar.tsx` — add Items nav entry

### Files that stay unchanged

- DynamicForm, field-registry, FormFieldWrapper — fully reusable
- ItemType, DynamicField, Status CRUD — no changes needed
- Phase 1 auth/project infrastructure — untouched

## Approaches

### Approach 1: JSON Column (Simple)

Store all dynamic field values in a single `Json` column on the `Item` table.

```
Item {
  id, projectId, itemTypeId, statusId, name, slug, description,
  fieldValues Json,  // { "serial_number": "ABC-123", "quantity": 42 }
  createdAt, updatedAt
}
```

| Aspect | Assessment |
|--------|-----------|
| **Pros** | Simple schema, fast single-table reads, no joins for basic display, easy CRUD |
| **Cons** | Cannot query/filter/sort by dynamic field values at DB level, no type safety at DB layer, difficult to enforce required-field constraints in DB |
| **Effort** | Low |

### Approach 2: EAV (Entity-Attribute-Value)

Separate `ItemFieldValue` table for each dynamic field value.

```
ItemFieldValue {
  id, itemId, dynamicFieldId, value Json, createdAt, updatedAt
}
```

| Aspect | Assessment |
|--------|-----------|
| **Pros** | Queryable at DB level, type-safe relations, can enforce required fields, supports aggregation |
| **Cons** | N+1 reads without eager loading, complex queries (pivoting for list views), more Prisma relations, harder pagination |
| **Effort** | High |

### Approach 3: Hybrid (JSON + Indexed Materialized Columns)

JSON column for storage + materialized columns for fields marked `showInList` or `showInSearch`.

| Aspect | Assessment |
|--------|-----------|
| **Pros** | Best of both: fast reads, queryable indexed fields, simple storage |
| **Cons** | Schema drift risk (field def changes vs materialized columns), complex sync logic, Prisma can't auto-generate materialized columns |
| **Effort** | High |

### Approach 4: EAV with JSON Value (Pragmatic EAV)

EAV table with `value Json` column. Combine with Prisma `include`/`select` for eager loading.

```
ItemFieldValue {
  id, itemId, dynamicFieldId, value Json
}
```

| Aspect | Assessment |
|--------|-----------|
| **Pros** | DB-level queries on field presence, typed relations, supports filtering/sorting via raw SQL or Prisma aggregation, flexible value types |
| **Cons** | Requires pivoting for list views (or use raw SQL), more complex than JSON-only, N+1 risk without careful includes |
| **Effort** | Medium |

## Recommendation

**Approach 4: EAV with JSON Value** — pragmatic EAV.

Rationale:
1. **Filtering and sorting on dynamic fields** is a core Phase 3 deliverable ("Listado con filtros"). A JSON column cannot support DB-level WHERE/ORDER BY on individual field values without PostgreSQL `jsonb` path queries, which are fragile and non-portable.
2. **EAV with `value Json`** allows storing any field type (string, number, boolean, array) without type-specific columns, while keeping the relational integrity of a proper FK to `DynamicField`.
3. **Prisma `include`** can eagerly load `fieldValues` with their `dynamicField` definitions, avoiding N+1 for detail views.
4. **List views** can load items first, then batch-load field values for `showInList` fields — this is a single extra query, not N+1.
5. **Effort is medium** — significantly simpler than full typed EAV, and the JSON value column gives flexibility without schema explosion.
6. **Future-proof** — supports Phase 6 (locations), Phase 7 (maps), Phase 8 (reports) without schema rewrites.

## Prisma Schema Design (Recommended)

```prisma
model Item {
  id          String   @id @default(cuid())
  projectId   String
  itemTypeId  String
  statusId    String?
  name        String
  slug        String
  description String?
  fieldValues ItemFieldValue[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  itemType ItemType @relation(fields: [itemTypeId], references: [id], onDelete: Cascade)
  status   Status?  @relation(fields: [statusId], references: [id], onDelete: SetNull)

  @@unique([itemTypeId, slug])
  @@index([projectId])
  @@index([itemTypeId])
  @@index([statusId])
  @@map("items")
}

model ItemFieldValue {
  id             String      @id @default(cuid())
  itemId         String
  dynamicFieldId String
  value          Json?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  item         Item         @relation(fields: [itemId], references: [id], onDelete: Cascade)
  dynamicField DynamicField @relation(fields: [dynamicFieldId], references: [id], onDelete: Cascade)

  @@unique([itemId, dynamicFieldId])
  @@index([itemId])
  @@index([dynamicFieldId])
  @@map("item_field_values")
}
```

Key decisions:
- `statusId` is nullable — items can exist without a status initially (auto-assign default status on create)
- `slug` unique per ItemType (same pattern as DynamicField `key` and Status `key`)
- Cascade delete from Item removes field values; SetNull on status means deleting a status doesn't delete items
- `value Json?` — stores the raw value (string, number, boolean, array) matching the field type

## API Structure

```
GET    /api/projects/{projectId}/items                    — List items (with filters)
POST   /api/projects/{projectId}/items                    — Create item
GET    /api/projects/{projectId}/items/{itemId}           — Get item with field values
PUT    /api/projects/{projectId}/items/{itemId}           — Update item + field values
DELETE /api/projects/{projectId}/items/{itemId}           — Soft-delete (archive) item
PATCH  /api/projects/{projectId}/items/{itemId}/status    — Transition status
```

Nested under `projects/{projectId}/items/` (not under `item-types`) because items are the primary entity users interact with. Item type is a property of the item, not the other way around.

## Filtering & Sorting

List endpoint supports:
- `?itemTypeId=xxx` — filter by type
- `?statusId=xxx` — filter by status
- `?search=xxx` — text search across name + fields with `showInSearch: true`
- `?field_{key}=value` — filter by specific dynamic field value
- `?sort=name|createdAt|status` — sort by standard fields
- `?sort=field_{key}` — sort by dynamic field value
- `?page=1&limit=20` — pagination

## Status Transitions

- Items are assigned a status on creation (the ItemType's default status, or explicit)
- `PATCH /items/{itemId}/status` changes the status
- `isFinal` statuses block further transitions (terminal states)
- `isBlocking` statuses trigger alerts (Phase 5)
- Transition history is deferred to Phase 3 Slice 2 (basic audit trail)

## Risks

1. **Prisma baseline blocker** — ADR-005 requires production schema inspection/backup/baseline before deploying any new models. The baseline migration artifacts exist but operational rollout is pending. Phase 3 code can be developed locally, but production deployment is blocked until baseline is applied.

2. **EAV query complexity** — Filtering/sorting on dynamic field values requires either raw SQL or Prisma's `$queryRaw`. The list endpoint will need a query builder for field-value filters. Mitigate with a focused `item-repository.ts` that encapsulates the complexity.

3. **Performance on large datasets** — EAV pivoting for list views can be slow with many items + many fields. Mitigate with pagination, selective field loading, and database indexes on `item_field_values(item_id)` and `item_field_values(dynamic_field_id)`.

4. **Field type coercion** — JSON values lose type information. The service layer must coerce values back to the correct type (number fields return numbers, not strings). The Zod schema factory from Phase 2 can help validate on write.

5. **DynamicField deletion with existing items** — If a DynamicField is deactivated while items have values for it, those values become orphaned. Need a policy: either prevent field deletion when items exist, or cascade-deactivate values.

6. **Slug uniqueness** — Items need unique slugs per ItemType. The `@@unique([itemTypeId, slug])` constraint handles this, but slug generation (from name) needs a conflict-resolution strategy.

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should proceed with `sdd-propose` to define the scope, approach, and rollback plan for Phase 3. Key points to include in the proposal:

1. Use EAV with JSON value column for dynamic field storage
2. Slice the work into: (1) Item model + CRUD API, (2) Item list with filters, (3) Item detail/edit with DynamicForm, (4) Status transitions
3. Note the ADR-005 baseline prerequisite for production deployment
4. Reuse DynamicForm, field-registry, and Zod schema factory from Phase 2
