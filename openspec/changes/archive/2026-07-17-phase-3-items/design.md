# Design: Phase 3 — Items CRUD

## Technical Approach

EAV pattern with JSON value storage. `Item` holds core fields (name, slug, typeId, statusId). `ItemFieldValue` stores per-field dynamic data as `value Json?` keyed by `dynamicFieldId`. Reuses Phase 2's `DynamicForm` + `createFieldValueSchema` for validation. Follows existing repository → service → API route layering.

## Architecture Decisions

### Decision: EAV with JSON value column

| Option | Tradeoff | Decision |
|--------|----------|----------|
| JSONB column on Item | Simple queries, no schema flexibility | Rejected — loses field-level metadata |
| EAV with typed columns (int_val, text_val…) | Type-safe reads, complex schema | Rejected — 18 types = too many nullable columns |
| EAV with `value Json?` | Flexible, single column, Zod validates on write | **Chosen** |

**Rationale**: Zod schema factory already validates per-type on write. JSON storage avoids column explosion while keeping field-level granularity for future filtering/sorting.

### Decision: Slug uniqueness scope

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Global unique | Simpler constraint, name collisions across types | Rejected |
| Per-project unique | Avoids cross-type conflicts, still broad | Rejected |
| Per-ItemType unique | Natural grouping, matches ItemType slug pattern | **Chosen** |

**Rationale**: `@@unique([itemTypeId, slug])` mirrors `@@unique([projectId, slug])` on ItemType. Users think of items within a type context.

### Decision: Status on create

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Required in API | User must know valid statuses | Rejected |
| Nullable, auto-assign default | Graceful default, explicit override possible | **Chosen** |

**Rationale**: Service auto-assigns ItemType's default Status (`isDefault=true`) when `statusId` is omitted. Nullable allows items without status if no default exists.

### Decision: Authorization model

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Owner-only mutations | Too restrictive for team use | Rejected |
| Member can create/edit, Owner can delete | Balanced write access | **Chosen** |

**Rationale**: Matches ItemType pattern — `requireProjectMember` for reads/create/update, `requireProjectOwner` for delete.

## Data Flow

```
Browser ──→ API Route (auth + parse)
               │
               ▼
         Service (business rules, access control)
               │
               ▼
         Repository (Prisma queries)
               │
               ▼
         PostgreSQL (Item + ItemFieldValue)

Create flow:
  1. Validate input (Zod)
  2. requireProjectMember
  3. Verify ItemType exists + is ACTIVE
  4. Verify DynamicField IDs belong to ItemType
  5. Auto-generate slug from name (resolve conflicts with -2, -3…)
  6. Auto-assign default statusId if omitted
  7. Prisma transaction: create Item + create ItemFieldValues

List flow:
  1. Load Items (filtered by type/status, paginated)
  2. Batch-load field values for showInList fields (single query)
  3. Return hydrated items
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Add Item, ItemFieldValue models + relations |
| `packages/validation/src/item.ts` | Create | Zod schemas: createItemSchema, updateItemSchema, itemFieldValueSchema |
| `packages/validation/src/index.ts` | Modify | Export item schemas |
| `apps/web/src/lib/repositories/item-repository.ts` | Create | CRUD functions following item-type-repository pattern |
| `apps/web/src/lib/services/item-service.ts` | Create | Business logic, slug generation, status auto-assign |
| `apps/web/src/app/api/projects/[projectId]/items/route.ts` | Create | GET (list), POST (create) |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/route.ts` | Create | GET (detail), PATCH (update), DELETE |
| `apps/web/src/app/api/projects/[projectId]/items/[itemId]/status/route.ts` | Create | PATCH (status transition) |

## Interfaces / Contracts

```typescript
// packages/validation/src/item.ts
export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(), // auto-generated from name if omitted
  itemTypeId: z.string().cuid(),
  statusId: z.string().cuid().optional(), // auto-assign default if omitted
  fieldValues: z.array(z.object({
    dynamicFieldId: z.string().cuid(),
    value: z.unknown(), // validated per-field by createFieldValueSchema
  })).optional(),
});

export const updateItemSchema = z.object({
  name: nameSchema.optional(),
  statusId: z.string().cuid().optional(),
  fieldValues: z.array(z.object({
    dynamicFieldId: z.string().cuid(),
    value: z.unknown(),
  })).optional(),
}).refine(v => Object.keys(v).length > 0);

export const transitionStatusSchema = z.object({
  statusId: z.string().cuid(),
});
```

```typescript
// Repository return types (Prisma-generated)
type ItemWithFields = Item & {
  fieldValues: ItemFieldValue[];
  status: Status | null;
  itemType: ItemType;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Slug generation, conflict resolution, status auto-assign | Vitest, isolated functions |
| Unit | Validation schemas (valid/invalid inputs) | Vitest + Zod safeParse |
| Repository | CRUD operations, transaction atomicity | Vitest + Prisma mock (existing pattern) |
| Service | Business rules: access control, isFinal enforcement, field validation | Vitest + mocked repository |
| API | Request/response contracts, error mapping | Vitest + mocked service (existing route test pattern) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. `prisma migrate dev` to generate migration for Item + ItemFieldValue tables
2. No data migration needed — new tables only
3. Production deploy blocked until ADR-005 baseline is applied
4. No feature flags — items are additive, no existing behavior changes

## Open Questions

- [ ] Should DynamicField deletion be blocked when ItemFieldValues reference it? (Proposal says cascade-deactivate; needs confirmation)
- [ ] Max field values per item? (performance guard for large EAV sets)
