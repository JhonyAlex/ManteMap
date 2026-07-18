# Proposal: Phase 3 — Items CRUD

## Intent

ManteMap has ItemType definitions, DynamicFields, and Statuses — but no actual Items. Users cannot create, view, or manage domain objects. Phase 3 introduces the central entity that ties ItemType + field values + Status together, enabling the core value proposition: managing assets with dynamic data.

## Scope

### In Scope
- `Item` and `ItemFieldValue` Prisma models (EAV with JSON value)
- Item CRUD API routes under `/api/projects/{projectId}/items/`
- Item repository and service layers
- Item list page with filters (type, status, text search)
- Item create/edit using existing `DynamicForm` component
- Item detail view with field values rendered by type
- Status transitions via dedicated endpoint
- Slug auto-generation with conflict resolution

### Out of Scope
- Field-value filtering/sorting on dynamic fields (deferred to Slice 2)
- Audit trail / transition history
- FILE, IMAGE, ITEM_RELATION field types (already deferred in form-generation spec)
- Bulk operations (multi-select, batch delete)
- Export / import

## Capabilities

### New Capabilities
- `item-management`: Item CRUD lifecycle — create, read, update, delete items with EAV field values; project-scoped access; slug uniqueness per ItemType; status assignment on create; nested API routes under projects

### Modified Capabilities
- `configurable-statuses`: Status transitions become active — `isFinal` blocks further transitions, `isBlocking`/`isIncident` flags gain meaning. Deferred booleans from Phase 2 now participate in item lifecycle validation.

## Approach

**EAV with JSON Value** — `ItemFieldValue` table stores `dynamicFieldId` FK + `value Json?`.

- Reuse `DynamicForm` + `createFieldValueSchema` from Phase 2 for create/edit
- `statusId` nullable; auto-assign ItemType default status on create
- `@@unique([itemTypeId, slug])` with auto-generation from name
- Cascade delete Item → ItemFieldValue; SetNull on Status deletion
- List endpoint loads items, then batch-loads `showInList` field values (single extra query)
- Repository encapsulates Prisma complexity; service enforces business rules

### Slice Breakdown
1. **Item model + CRUD API** — Prisma models, repository, service, API routes (create/get/update/delete)
2. **Item list with filters** — list page, type/status filters, text search, pagination
3. **Item detail/edit with DynamicForm** — detail view, edit form reusing Phase 2 components
4. **Status transitions** — `PATCH /items/{itemId}/status`, `isFinal` enforcement, default assignment

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modified | Add Item, ItemFieldValue models |
| `packages/validation/src/item.ts` | New | Zod schemas for create/update |
| `apps/web/src/lib/repositories/item-repository.ts` | New | Data access layer |
| `apps/web/src/lib/services/item-service.ts` | New | Business logic |
| `apps/web/src/app/api/projects/[projectId]/items/` | New | API routes |
| `apps/web/src/components/items/` | New | List, detail, form components |
| `apps/web/src/components/layout/sidebar.tsx` | Modified | Items nav entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ADR-005 baseline not applied — production deploy blocked | High | Develop locally; production deploy deferred until baseline |
| EAV query complexity for list filtering | Medium | Encapsulate in repository; use raw SQL for field filters |
| DynamicField deletion with existing item values | Medium | Cascade-deactivate values; prevent hard delete when items exist |
| Field type coercion from JSON | Low | Validate on write via Zod; coerce on read in service layer |

## Rollback Plan

1. Drop `ItemFieldValue` table (cascade removes all field values)
2. Drop `Item` table (cascade removes items)
3. Remove added API routes and components
4. Revert sidebar nav change
5. No impact on existing Phase 1–2 functionality — Item has no inbound FKs

## Dependencies

- ADR-005 Prisma baseline (operational prerequisite for production)
- Phase 2 DynamicForm, field-registry, Zod schema factory (already complete)

## Success Criteria

- [ ] Create item with dynamic field values via API
- [ ] List items filtered by type and status
- [ ] Edit item fields using DynamicForm
- [ ] Status transitions enforce `isFinal` constraint
- [ ] All new code passes lint + typecheck
- [ ] Unit tests for item service and repository
