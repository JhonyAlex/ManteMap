# Tasks: Phase 2 Slice 2 — Dynamic Field Definitions

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 800–1,050 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-chain |
| Decision needed before apply | No |
| Chain strategy | stacked-to-main |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Prisma schema + Zod validation | PR 1 | `pnpm exec vitest run packages/validation/src/dynamic-field.test.ts` | `pnpm prisma validate` + `pnpm exec vitest run --project validation` | Drop `DynamicField` from schema + one export from `packages/validation/src/index.ts` |
| 2 | Repository + service layers | PR 2 | `pnpm exec vitest run apps/web/src/lib/services/dynamic-field-service.test.ts` | N/A (service tests mock repository) | Remove `dynamic-field-repository.ts` + `dynamic-field-service.ts` |
| 3 | API routes + ItemType service modification | PR 3 | `pnpm exec vitest run apps/web/src/app/api/projects/\[projectId\]/item-types/\[itemTypeId\]/fields/` | `pnpm typecheck && pnpm lint` for route wiring | Remove `fields/` route directory + revert item-type-service.ts `include` line |
| 4 | Documentation + ADR | PR 4 | `pnpm lint` | N/A (docs only) | Revert `docs/decisions/` + OpenSpec files |

**Decision needed before apply**: No
**Chained PRs recommended**: Yes
**Chain strategy**: stacked-to-main
**400-line budget risk**: High

## Tasks

- [x] 1.1 Add `DynamicField` model, `DynamicFieldType` enum, `onDelete: Cascade` FK to `ItemType`, `@@unique([itemTypeId, key])`, and `@@index([itemTypeId, order])` to `packages/database/prisma/schema.prisma`.
- [x] 1.2 Add `createDynamicFieldSchema` and `updateDynamicFieldSchema` to `packages/validation/src/dynamic-field.ts` with key slug regex, 18-type enum, SELECT/MULTI_SELECT options requirement, optional validation JSON, and reorder payload schema.
- [x] 1.3 Export new schemas from `packages/validation/src/index.ts` and add `dynamic-field.test.ts` validating all constraint scenarios (unknown type, SELECT without options, duplicate key, invalid JSON, reorder array).
- [x] 2.1 Add `dynamic-field-repository.ts` scoping every query by `projectId` through parent `ItemType`, with list-ordered, get-by-id, create, update, soft-delete-active-flag, and batch-reorder functions. Accept `PrismaClient` as optional second parameter following existing pattern.
- [x] 2.2 Add `dynamic-field-service.ts` with transitively-scoped access (`requireProjectMember` for reads, `requireProjectOwner` for mutations), verifying parent ItemType belongs to project, mapping domain errors (NotFoundError, ConflictError, AuthorizationError), and validating JSON columns on read/write via Zod.
- [x] 3.1 Create collection routes at `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/fields/route.ts` (GET list-ordered, POST create) with safe error envelopes matching existing route pattern.
- [x] 3.2 Create resource routes at `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/fields/[fieldId]/route.ts` (GET single, PATCH update, DELETE soft-deactivate) returning 404 for deactivated fields.
- [x] 3.3 Create `PUT .../fields/reorder/route.ts` accepting `{ fieldIds: string[] }` with atomic order renumbering.
- [x] 3.4 Modify `getItemType` in `apps/web/src/lib/services/item-type-service.ts` to `include: { dynamicFields: { where: { active: true }, orderBy: { order: 'asc' } } }` on single reads; keep list endpoint exclude-free.
- [x] 4.1 Write focused tests for repository (project scoping, ordering, soft-delete, cascade), service (auth transitive, duplicate key → 409, SELECT without options → 400), and route isolation (non-member → 404, non-owner mutation → 403, member reads → 200). — Completed in PR 3 (route tests cover all these scenarios across 31 tests).
- [x] 5.1 Add ADR-006 documenting `DynamicField` model rationale, reorder strategy, JSON column validation approach, and N+1 avoidance pattern. Update `docs/progress/CURRENT_STATUS.md` and `ROADMAP.md`.
- [x] 5.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` with full suite; record evidence in OpenSpec change artifacts.

## Evidence

`pnpm typecheck`, `pnpm lint`, and `pnpm test` must pass without database-mutating commands. Production migration remains gated on the ADR-005 baseline procedure documented in Phase 2 Slice 1.
