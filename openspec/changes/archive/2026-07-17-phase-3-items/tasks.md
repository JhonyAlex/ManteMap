# Tasks: Phase 3 — Items CRUD

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation: Prisma models, validation, repository, service | PR 1 | `pnpm test -- item-repository item-service item.ts` | N/A — unit tests only | Drop Item/ItemFieldValue tables, delete item.ts, item-repository.ts, item-service.ts |
| 2 | List + Detail API routes | PR 2 | `pnpm test -- items/route` | N/A — route tests mock services | Delete items/route.ts, items/[itemId]/route.ts |
| 3 | Status transitions + integration | PR 3 | `pnpm test -- items/[itemId]/status` | N/A — route test mocks service | Delete status/route.ts |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Add `Item` model to `packages/database/prisma/schema.prisma` — id, name, slug, itemTypeId FK, statusId FK nullable, createdAt, updatedAt; `@@unique([itemTypeId, slug])`, `@@map("items")`
- [x] 1.2 Add `ItemFieldValue` model — id, itemId FK, dynamicFieldId FK, value Json?, createdAt, updatedAt; cascade delete from Item; `@@map("item_field_values")`
- [x] 1.3 Add relations: Item → ItemType, Item → Status, Item → ItemFieldValue[]; ItemType.items[], Status.items[]
- [x] 1.4 Run `pnpm prisma generate` to update Prisma client types
- [x] 1.5 Create `packages/validation/src/item.ts` — `createItemSchema`, `updateItemSchema`, `transitionStatusSchema` per design interfaces
- [x] 1.6 Add `export * from './item'` to `packages/validation/src/index.ts`
- [x] 1.7 RED: Write failing tests for `apps/web/src/lib/repositories/item-repository.ts` — CRUD operations, transaction atomicity
- [x] 1.8 GREEN: Implement `item-repository.ts` following `item-type-repository.ts` pattern — createItem, findItemById, findItemsByProject, updateItem, deleteItem
- [x] 1.9 RED: Write failing tests for `apps/web/src/lib/services/item-service.ts` — access control, slug generation, status auto-assign, isFinal enforcement
- [x] 1.10 GREEN: Implement `item-service.ts` — createItem (slug auto-gen, default status), getItem, listItems, updateItem, deleteItem, transitionStatus
- [x] 1.11 REFACTOR: Verify lint + typecheck pass for PR 1 scope

## Phase 2: List + Detail API (PR 2)

- [x] 2.1 RED: Write failing tests for `apps/web/src/app/api/projects/[projectId]/items/route.ts` — GET (list with filters), POST (create)
- [x] 2.2 GREEN: Implement items/route.ts — GET with itemTypeId/statusId/search filters + pagination; POST with validation
- [x] 2.3 RED: Write failing tests for `apps/web/src/app/api/projects/[projectId]/items/[itemId]/route.ts` — GET (detail), PATCH (update), DELETE
- [x] 2.4 GREEN: Implement items/[itemId]/route.ts — detail with hydrated field values, partial update, cascade delete
- [x] 2.5 REFACTOR: Verify lint + typecheck pass for PR 2 scope

## Phase 3: Status Transitions (PR 3)

- [x] 3.1 RED: Write failing tests for `apps/web/src/app/api/projects/[projectId]/items/[itemId]/status/route.ts` — PATCH transitions, isFinal block, deactivated status rejection
- [x] 3.2 GREEN: Implement status/route.ts — PATCH endpoint enforcing isFinal, isBlocking, isIncident semantics
- [x] 3.3 Verify all spec scenarios pass: final status blocks, valid transition, deactivated status rejected
- [x] 3.4 REFACTOR: Verify lint + typecheck + full test suite pass

## Phase 4: Verification

- [x] 4.1 Run `pnpm lint` — zero errors (pre-existing warning in status-service.test.ts only)
- [x] 4.2 Run `pnpm typecheck` — zero errors (pre-existing @mantemap/ui label module error only)
- [x] 4.3 Run `pnpm test` — all new + existing tests pass (207/207)
- [x] 4.4 Verify rollback: drop tables, delete files, confirm Phase 1-2 unaffected
