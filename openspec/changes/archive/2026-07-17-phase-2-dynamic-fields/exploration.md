# Exploration: Phase 2 Slice 2 — Dynamic Field Definitions

## Current State

Phase 2 Slice 1 delivered project-scoped ItemType CRUD following a consistent architecture: Zod validation in shared packages, access guards (`requireProjectMember`/`requireProjectOwner`) with no ADMIN bypass, Prisma repositories with `projectId` as first parameter, and API routes that map domain errors to HTTP status codes. The Prisma schema has `ItemType` (id, projectId, name, slug, description, icon, color, status, timestamps) with `@@unique([projectId, slug])`. No field definitions exist on the model yet.

Critically, the **shared types package already defines the target interface**: `DynamicFieldDefinition`, `DynamicFieldType` (18 types), `FieldOption`, and `FieldValidation` live in `packages/shared/src/types/domain.ts`. These were designed during Phase 0 discovery and define 18 field types: `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `DECIMAL`, `CURRENCY`, `BOOLEAN`, `DATE`, `DATETIME`, `SELECT`, `MULTI_SELECT`, `URL`, `EMAIL`, `PHONE`, `FILE`, `IMAGE`, `ITEM_RELATION`, `LOCATION_RELATION`, `USER_RELATION`.

The ROADMAP specifies four sub-deliverables for dynamic fields: field definition CRUD, configurable statuses, generated forms, and Zod validation from definitions. This slice focuses on the **field definition data model and CRUD** — storing and managing which fields belong to each ItemType.

## Affected Areas

- `packages/database/prisma/schema.prisma` — Add `DynamicField` model with FK to `ItemType`, enum `DynamicFieldType`
- `packages/database/prisma/migrations/` — New migration after the Phase 2 Slice 1 baseline
- `packages/shared/src/types/domain.ts` — Existing `DynamicFieldDefinition`, `DynamicFieldType`, `FieldOption`, `FieldValidation` interfaces; may need alignment with Prisma model
- `packages/validation/src/` — New `dynamic-field.ts` with create/update Zod schemas, field-type-aware validation factory
- `apps/web/src/lib/repositories/` — New `dynamic-field-repository.ts` following project-scoped pattern
- `apps/web/src/lib/services/` — New `dynamic-field-service.ts` with access guards, or extend `item-type-service.ts`
- `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/fields/` — New nested API routes
- `apps/web/src/lib/services/item-type-service.ts` — May need `include: { dynamicFields: true }` on reads
- `openspec/changes/phase-2-dynamic-fields/` — New OpenSpec change artifacts

## Approaches

### 1. Relational Table (`DynamicField` model with FK to `ItemType`) — RECOMMENDED

Create a `DynamicField` Prisma model with `itemTypeId`, `key`, `type` (enum), `order`, `required`, `options` (JSON), `validation` (JSON), and metadata columns. One-to-many from ItemType.

- **Pros**:
  - Matches existing architecture pattern (relational models, FK constraints, Prisma relations)
  - Fully queryable by field type, itemTypeId, or key
  - Prisma generates types automatically
  - Migrations work correctly (`prisma migrate dev`)
  - Cascade delete from ItemType (onDelete: Cascade)
  - Options and validation stored as `Json?` — Prisma handles JSONB natively
  - Can `include: { dynamicFields: true }` on ItemType reads
  - `@@unique([itemTypeId, key])` enforces per-type key uniqueness
  - `@@index([itemTypeId, order])` for ordered retrieval

- **Cons**:
  - Slightly more verbose than JSONB approach
  - Two JSON columns (options, validation) that need runtime validation
  - Requires a join for ItemType + fields (Prisma `include` handles this seamlessly)

- **Effort**: Medium

### 2. JSONB Column on `ItemType`

Add a `fields Json[]` column directly to the `ItemType` model. All field definitions stored as a single array.

- **Pros**:
  - Single table, no joins needed
  - Simpler migration (one column)
  - Fields always loaded with ItemType

- **Cons**:
  - Cannot query individual fields ("find all ItemTypes that have a SELECT field")
  - Prisma `Json` type has limited type safety — manual casting required
  - Array mutations are complex: need to read, modify, write entire array
  - Ordering within array requires full array replacement
  - Violates relational pattern already established in the codebase
  - No FK constraint on `options` structure
  - Harder to evolve later (Phase 3 Items will need to reference field definitions)

- **Effort**: Low initial, High maintenance

### 3. Polymorphic Table-per-Type

Separate Prisma model per field type (`ShortTextField`, `NumberField`, `SelectField`, etc.) with a base `DynamicField` super-table.

- **Pros**:
  - Type-safe storage per field type
  - Each table has only its relevant columns

- **Cons**:
  - 18 separate tables — Prisma schema bloat
  - Complex union queries to get all fields for an ItemType
  - No Prisma support for table inheritance / polymorphic associations
  - Massive over-engineering for the problem
  - Every new field type requires a new model + migration

- **Effort**: Very High

## Recommendation

**Approach 1 — Relational `DynamicField` table.** This is the natural extension of the existing architecture. The codebase already uses relational Prisma models with FK constraints, `include` for eager loading, and JSON columns for semi-structured data (`Project.config` already uses `Json?`). The `DynamicFieldDefinition` interface in shared types was designed for exactly this model.

### Prisma Model

```prisma
model DynamicField {
  id           String           @id @default(cuid())
  itemTypeId   String
  name         String
  key          String
  type         DynamicFieldType
  description  String?
  required     Boolean          @default(false)
  defaultValue Json?
  order        Int              @default(0)
  visible      Boolean          @default(true)
  active       Boolean          @default(true)
  options      Json?
  unit         String?
  validation   Json?
  showInList   Boolean          @default(false)
  showInSearch Boolean          @default(false)
  helpText     String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  itemType ItemType @relation(fields: [itemTypeId], references: [id], onDelete: Cascade)

  @@unique([itemTypeId, key])
  @@index([itemTypeId, order])
  @@map("dynamic_fields")
}

enum DynamicFieldType {
  SHORT_TEXT
  LONG_TEXT
  NUMBER
  DECIMAL
  CURRENCY
  BOOLEAN
  DATE
  DATETIME
  SELECT
  MULTI_SELECT
  URL
  EMAIL
  PHONE
  FILE
  IMAGE
  ITEM_RELATION
  LOCATION_RELATION
  USER_RELATION
}
```

### API Route Design

Fields are nested under ItemType since they have no independent existence:

- `GET    /api/projects/:projectId/item-types/:itemTypeId/fields` — list all fields (ordered)
- `POST   /api/projects/:projectId/item-types/:itemTypeId/fields` — create a field
- `GET    /api/projects/:projectId/item-types/:itemTypeId/fields/:fieldId` — get one field
- `PATCH  /api/projects/:projectId/item-types/:itemTypeId/fields/:fieldId` — update a field
- `DELETE /api/projects/:projectId/item-types/:itemTypeId/fields/:fieldId` — delete a field
- `PUT    /api/projects/:projectId/item-types/:itemTypeId/fields/reorder` — reorder fields

### Authorization

Same pattern as ItemType: `requireProjectMember` for reads, `requireProjectOwner` for mutations. The project ID is extracted from the route (`projectId` param). Before field operations, verify the ItemType belongs to that project (transitive scoping). No ADMIN bypass.

### Validation Strategy

Two layers of Zod validation:

1. **Field Definition Schema** (static): Validates the field definition itself — `key` format, `type` validity, `order` uniqueness, `options` structure for SELECT types.
2. **Field Value Schema Factory** (dynamic, deferred to Slice 4): Function `createFieldValueSchema(field: DynamicFieldDefinition): ZodSchema` that returns a type-appropriate schema for validating Item field values — e.g., `z.number().min(0).max(100)` for NUMBER with validation rules.

### Ordering Strategy

Use an integer `order` column. Reordering via `PUT .../fields/reorder` with `{ fieldIds: string[] }` payload — the array order becomes the new `order` values. Simpler than gap-based or linked-list approaches.

### Key Uniqueness

`@@unique([itemTypeId, key])` ensures no duplicate machine-readable keys within an ItemType. The `key` field uses the same slug regex as ItemType (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).

## Design Decisions to Defer

- **Form generation from field definitions** — Slice 4 concern. The data model supports it (type, required, options, helpText all present).
- **Field value storage** — Phase 3 (Items). Will need a separate storage strategy (likely EAV or JSONB for item values) — but *field definitions* must be relational for queryability.
- **Configurable statuses** — separate slice, different data model.

## Risks

- **Prisma enum synchronization**: The `DynamicFieldType` enum must stay in sync between Prisma schema and the shared `DynamicFieldType` type union. A mismatch breaks generated types.
- **JSON column validation**: `options` and `validation` are `Json?` — Prisma won't validate their shape. Runtime Zod validation on read/write is essential. The service layer must parse and validate JSON columns.
- **N+1 on ItemType list**: If every ItemType list call includes all fields, avoid eager-loading fields on list endpoints. Only include fields on single-ItemType GET or explicit field endpoints.
- **Migration baseline**: Production still needs the ADR-005 backup/baseline procedure. Adding `DynamicField` is a second migration after the ItemType migration is baselined.
- **Field deletion**: Deleting a field definition after Items exist with values for that field is a future concern (Phase 3). For now, field deletion is safe since no Items exist yet. Flag this for the Item storage design.

## Ready for Proposal

Yes. The data model, API surface, validation strategy, and authorization model are clear. Proceed to `sdd-propose` for the formal change proposal.
