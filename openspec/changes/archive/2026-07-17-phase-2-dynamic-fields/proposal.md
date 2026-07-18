# Proposal: Phase 2 Slice 2 — Dynamic Field Definitions

## Intent

Owners define per-ItemType field schemas so each type carries the right data shape. Members read the definitions. This delivers the persistence layer that generated forms (Slice 4) and item values (Phase 3) depend on.

## Scope

### In Scope

- `DynamicField` Prisma model: FK to `ItemType`, 18-type enum, JSON `options`/`validation`, integer `order`
- Nested CRUD under `/api/projects/:projectId/item-types/:itemTypeId/fields`
- `PUT .../fields/reorder` endpoint for atomic field sequencing
- Zod definition schema: type-aware validation (SELECT requires `options`)
- Project-scoped auth: owner mutates, member reads, non-member → 404
- `@@unique([itemTypeId, key])`, `@@index([itemTypeId, order])`

### Out of Scope

- Generated forms/UI (Slice 4), item values (Phase 3), configurable statuses
- Field deletion after Items exist — deferred to Phase 3
- `createFieldValueSchema` factory — deferred to Slice 4
- ADMIN bypass (consistent with existing auth)

## Capabilities

### New

- `dynamic-field-definitions`: CRUD + reorder API for field definitions nested under Item Types

### Modified

- `item-type-management`: single-read includes fields; list endpoint excludes them to avoid N+1

## Approach

Same layered pattern as Slice 1: **Prisma → Zod → repository → service → route**. Relational model with `onDelete: Cascade`; JSON columns validated at runtime via Zod. Auth verified transitively through the parent ItemType. Reorder accepts `{ fieldIds: string[] }` and renumbers atomically.

## Affected Areas

| Area | Impact |
|------|--------|
| `packages/database/prisma/schema.prisma` | Add `DynamicField` + `DynamicFieldType` enum |
| `packages/validation/src/dynamic-field.ts` | New — Zod schemas |
| `apps/web/src/lib/repositories/dynamic-field-repository.ts` | New |
| `apps/web/src/lib/services/dynamic-field-service.ts` | New |
| `apps/web/src/app/api/.../fields/` | New — 6 route handlers |
| `apps/web/src/lib/services/item-type-service.ts` | Modified — conditional field inclusion |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Prisma enum drifts from shared type union | M | CI typecheck catches mismatches |
| JSON columns accept invalid shapes | M | Repository validates via Zod on read/write |
| Migration blocked by pending ADR-005 | H | Gated on baseline — unchanged from Slice 1 |

## Rollback

1. Revert migration → drop `dynamic_fields` table and enum
2. Remove route handlers, service, repository
3. Item Type API returns to Slice 1 shape — zero breaking changes

## Dependencies

- Phase 2 Slice 1 Item Type CRUD (complete)
- ADR-005 baseline before production migration

## Success Criteria

- [ ] 18 field types creatable under any Item Type; members can list
- [ ] `@@unique([itemTypeId, key])` enforced at DB level
- [ ] Reorder updates all `order` values atomically
- [ ] Non-members → 404; members → 403 on mutations
- [ ] SELECT types require `options`; invalid → 400
- [ ] Single-read includes fields; list excludes them
- [ ] 12–15 project-scoped isolation tests pass
