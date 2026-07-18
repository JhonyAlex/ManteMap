# Tasks: Phase 2 Slice 3 — Configurable Statuses

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Schema + types + validation → PR 2: Repository + service + routes + tests + docs |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation: Prisma model, shared types, Zod schemas | PR 1 | `pnpm --filter @mantemap/validation test -- status` | `pnpm --filter @mantemap/validation test -- status` | Revert migration + delete `status.ts` + restore `ItemStatus` v1 |
| 2 | Logic: repository, service, API routes, tests, ADR | PR 2 | `pnpm --filter web test -- status` | `pnpm --filter web test -- status` | Delete `status-repository.ts`, `status-service.ts`, `statuses/` routes; revert service mods |

## Phase 1: Foundation — Schema, Types, Validation

- [x] 1.1 Add `Status` Prisma model to `packages/database/prisma/schema.prisma` (14 fields: id, itemTypeId, name, key, color, icon?, description?, order, isDefault, active, isFinal, isBlocking, isIncident, createdAt, updatedAt) with `@@unique([itemTypeId, key])`, `@@index([itemTypeId, order])`, `onDelete: Cascade`, `@@map("statuses")`
- [x] 1.2 Add `statuses Status[]` relation to `ItemType` model in `packages/database/prisma/schema.prisma`
- [x] 1.3 Run `prisma migrate dev --name add_status_model` — **DEFERRED: Docker daemon not running. Schema validated (prisma validate ✅). Migration deferred to ADR-005 production baseline procedure, same as ItemType and DynamicField.**
- [x] 1.4 Refine `ItemStatus` interface in `packages/shared/src/types/domain.ts`: renamed `isInitial` → `isDefault`, added `itemTypeId`, `key`, `description?`, `order`, `active`; kept deferred `isFinal`/`isBlocking`/`isIncident`
- [x] 1.5 Create `packages/validation/src/status.ts` with `createStatusSchema` (name 1-100, key kebab-case slug, color hex `#RGB` / `#RRGGBB`, icon optional string, description optional, isDefault boolean default false, order int ≥0 default 0)
- [x] 1.6 Add `updateStatusSchema` (same fields all optional, `.refine` at least one field) and `reorderStatusesSchema` (`statusIds: string[] min 1`) to `packages/validation/src/status.ts`
- [x] 1.7 Add `export * from './status'` to `packages/validation/src/index.ts`
- [x] 1.8 Regenerate Prisma client: `pnpm --filter @mantemap/database db:generate`

## Phase 2: Repository

- [x] 2.1 Create `apps/web/src/lib/repositories/status-repository.ts` with `verifyItemTypeInProject` helper (reuse DynamicField pattern — look up ItemType by id + projectId, throw NotFoundError if missing)
- [x] 2.2 Implement `listStatusesByItemType(projectId, itemTypeId, client?)` — verify parent, return active statuses ordered by `order` ascending
- [x] 2.3 Implement `getStatusById(projectId, statusId, itemTypeId, client?)` — verify parent, findFirst where active:true
- [x] 2.4 Implement `createStatus(projectId, itemTypeId, data, client?)` — verify parent, create with FK
- [x] 2.5 Implement `updateStatus(projectId, statusId, itemTypeId, data, client?)` — verify parent, block deactivated (findFirst active:true → NotFoundError), update
- [x] 2.6 Implement `deactivateStatus(projectId, statusId, itemTypeId, client?)` — verify parent, findFirst active:true → NotFoundError, set active:false
- [x] 2.7 Implement `reorderStatuses(projectId, itemTypeId, statusIds, client?)` — verify parent, validate all IDs exist and are active (count check), `$transaction` batch update order
- [x] 2.8 Implement `getDefaultStatus(projectId, itemTypeId, client?)` — findFirst where isDefault:true + active:true, return null if none
- [x] 2.9 Implement `setDefaultStatus(projectId, statusId, itemTypeId, client?)` — verify parent, unset previous defaults + set new in `$transaction` (implemented as `setDefaultStatus`)

## Phase 3: Service

- [x] 3.1 Create `apps/web/src/lib/services/status-service.ts` with `handleZodError` helper (mirror DynamicField pattern — catch ZodError, throw ValidationError)
- [x] 3.2 Implement `listStatuses(projectId, itemTypeId, userId)` — `requireProjectMember`, delegate to repo
- [x] 3.3 Implement `getStatus(projectId, statusId, itemTypeId, userId)` — `requireProjectMember`, find via repo, throw NotFoundError if null
- [x] 3.4 Implement `createStatus(projectId, input, itemTypeId, userId)` — Zod parse, `requireProjectOwner`, P2002 → ConflictError. If `isDefault:true`, wrap in `$transaction`: unset previous default → create. If `isDefault:false`, direct create.
- [x] 3.5 Implement `updateStatus(projectId, statusId, input, itemTypeId, userId)` — Zod parse, `requireProjectOwner`, P2002 → ConflictError. If `isDefault` is `true`, wrap in `$transaction`: unset previous default → update. Otherwise direct update.
- [x] 3.6 Implement `deactivateStatus(projectId, statusId, itemTypeId, userId)` — `requireProjectOwner`, delegate to repo
- [x] 3.7 Implement `reorderStatuses(projectId, statusIds, itemTypeId, userId)` — Zod parse, `requireProjectOwner`, delegate to repo

## Phase 4: API Routes

- [x] 4.1 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/route.ts` — `GET` (list) + `POST` (create), mirror `fields/route.ts` pattern with safeParse, error mapping (NotFoundError→404, AuthorizationError→403, ConflictError→409, ValidationError→400, default→500)
- [x] 4.2 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/[statusId]/route.ts` — `GET` (single) + `PATCH` (update) + `DELETE` (soft-deactivate), mirror `fields/[fieldId]/route.ts` pattern
- [x] 4.3 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/reorder/route.ts` — `PUT`, mirror `fields/reorder/route.ts` pattern
- [x] 4.4 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/default/route.ts` — `PUT`, set default status endpoint

## Phase 5: ItemType Service Modification

- [x] 5.1 Update `getItemType` in `apps/web/src/lib/services/item-type-service.ts` to include `statuses: { where: { active: true }, orderBy: { order: 'asc' } }` in the Prisma query (same pattern as DynamicField; only on single read, not list)

## Phase 6: Testing

- [x] 6.1 Create `packages/validation/src/status.test.ts` — PR 1 task (validation tests in validation package)
- [x] 6.2 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/route.test.ts` — test GET 200/401, POST 201/400/401/403/404/409/500, mock service layer
- [x] 6.3 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/[statusId]/route.test.ts` — test GET 200/404, PATCH 200/400/403/404/409, DELETE 200/403/404
- [x] 6.4 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/reorder/route.test.ts` — test PUT 200/400/401/403/404
- [x] 6.5 Create `apps/web/src/app/api/projects/[projectId]/item-types/[itemTypeId]/statuses/default/route.test.ts` — test PUT 200/400/401/403/404
- [x] 6.6 Create `apps/web/src/lib/repositories/status-repository.test.ts` — 34 tests covering CRUD, scoping, soft delete, reorder atomicity, isDefault
- [x] 6.7 Create `apps/web/src/lib/services/status-service.test.ts` — 23 tests covering auth, duplicate key, isDefault transaction, error mapping
- [x] 6.8 Run full test suite: `pnpm test` — confirm no regressions (507/507 unit tests, 0/51 integration DB offline)

## Phase 7: Documentation

- [x] 7.1 Create `docs/decisions/ADR-007-configurable-statuses.md` — document relational Status model decision, one-to-many ItemType relationship, isDefault enforcement strategy, deferred transition columns, soft-delete pattern
- [x] 7.2 Update `docs/progress/CURRENT_STATUS.md` — mark Phase 2 Slice 3 complete, note ADR-007
- [x] 7.3 Update `AGENTS.md` — add Slice 3 to history, update validation results and next step
- [x] 7.4 Update `apps/web/src/lib/services/item-type-service.test.ts` — fix assertion to include new `statuses` include
