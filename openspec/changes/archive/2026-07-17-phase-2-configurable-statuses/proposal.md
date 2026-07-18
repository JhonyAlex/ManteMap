# Proposal: Phase 2 Slice 3 — Configurable Statuses

## Intent

Each ItemType defines its own workflow statuses with colors and icons. Equipment types get "Operativo"/"En Mantenimiento"/"Fuera de Servicio"; document types get "Borrador"/"Revisión"/"Aprobado". This delivers domain-specific state modeling without a one-size-fits-all enum. Members read statuses; owners manage them.

## Scope

### In Scope

- `Status` Prisma model: FK to `ItemType`, 11 fields (`id`, `itemTypeId`, `name`, `code`, `color`, `icon?`, `order`, `isDefault`, `active`, `createdAt`, `updatedAt`) + 3 deferred booleans (`isFinal`, `isBlocking`, `isIncident`)
- `@@unique([itemTypeId, code])`, `@@index([itemTypeId, order])`, `onDelete: Cascade`
- Nested CRUD under `/api/projects/:projectId/item-types/:itemTypeId/statuses`
- `PUT .../statuses/reorder` for atomic sequencing
- Service-layer transaction enforcing single `isDefault` per ItemType
- Project-scoped auth: owner mutates, member reads, non-member → 404
- Soft delete (`active: false`); deactivated statuses excluded from list, mutations → 404
- Zod validation: hex color, slug `code`, name 1-100 chars

### Out of Scope

- Status transitions/rules (deferred fields exist but no enforcement logic)
- Item integration (Phase 3: Items reference Status via FK)
- UI components, workflow engine, status history/audit trail

## Capabilities

### New

- `configurable-statuses`: Status CRUD, reorder, and default-enforcement API nested under Item Types

### Modified

- None (no existing spec covers ItemType detail retrieval; `getItemType` will include statuses as an additive behavior without breaking contracts)

## Approach

Mirrors **DynamicField** pattern exactly: Prisma model → Zod → repository (`verifyItemTypeInProject`) → service (`requireProjectOwner` guard) → nested API routes. Default enforcement via `prisma.$transaction`: unset previous default, then create/set new one. Soft delete reuses the `active` boolean pattern from DynamicField. Deferred `isFinal`/`isBlocking`/`isIncident` columns exist in the schema but are excluded from Zod schemas and API surface.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modified | Add `Status` model + `statuses` relation on `ItemType` |
| `packages/shared/src/types/domain.ts` | Modified | Refine `ItemStatus` interface (add `order`/`active`, rename `isInitial` → `isDefault`) |
| `packages/validation/src/status.ts` | New | Zod schemas: create, update, reorder |
| `packages/validation/src/index.ts` | Modified | Barrel export |
| `apps/web/src/lib/repositories/status-repository.ts` | New | Status data access |
| `apps/web/src/lib/services/status-service.ts` | New | Business logic + auth |
| `apps/web/src/app/api/.../statuses/` | New | 6 route handlers (list, create, get, update, delete, reorder) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `isDefault` race condition (two creates set default) | Medium | `$transaction` serializes unset + create |
| Naming collision with existing `ItemTypeStatus` enum | Low | Different domains: `ItemTypeStatus` = lifecycle, `Status` = item workflow |
| Duplicate `code` within ItemType (409) | Low | `@@unique([itemTypeId, code])` enforced at DB level |
| Future FK from Item to Status breaks on soft-delete | Low | Soft-delete preserves record; items keep reference |

## Rollback

1. Revert migration → drop `statuses` table
2. Remove route handlers, service, repository, Zod schemas
3. Restore `ItemStatus` interface to v1 shape (`isInitial` without `order`/`active`)
4. Item Type API unchanged — zero breaking changes

## Dependencies

- Phase 2 Slice 1: Item Type CRUD (complete)
- Phase 2 Slice 2: DynamicField (complete — pattern reference)
- ADR-005 production baseline before migration

## Success Criteria

- [ ] Owners can create statuses per ItemType with unique `code` enforced at DB level
- [ ] One `isDefault` per ItemType enforced via service-layer transaction
- [ ] Deactivated statuses excluded from list; mutations return 404
- [ ] Members can read; non-members receive 404; non-owners receive 403
- [ ] Reorder updates all `order` values atomically
- [ ] Hex color and code format validated at Zod level
