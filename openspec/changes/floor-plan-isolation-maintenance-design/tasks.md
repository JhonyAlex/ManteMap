# Tasks: Floor Plan Isolation and Maintenance Foundation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 180–280 now; 350–500 later |
| 400-line budget risk | High across both work units |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 isolation → later PR 2 model/migration |
| Delivery strategy | ask-on-risk (resolved to chained PRs) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No — user approved `feature-branch-chain`; this is PR 1.
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Close floor-plan ownership chains | PR 1 now | `pnpm --filter @mantemap/web exec vitest run src/lib/services/floor-plan-service.test.ts` | Authenticated cross-project API requests must return 404 with no writes | Revert floor-plan repo/service/tests only |
| 2 | Add maintenance persistence | PR 2 later | `pnpm --filter @mantemap/database test` | Apply new migration to isolated PostgreSQL and inspect constraints | Revert the new migration before deployment and schema/types together |

## Phase 1: Isolation RED Tests (Now)

- [x] 1.1 Extend `apps/web/src/lib/services/floor-plan-service.test.ts` with foreign location/plan cases for upload, list, detail, image, and delete; assert no StorageDriver or mutation call.
- [x] 1.2 Add marker tests for foreign plan, marker-plan mismatch, foreign item, and duplicate `(floorPlanId,itemId)` on create/reassignment.

## Phase 2: Isolation GREEN/REFACTOR (Now)

- [x] 2.1 Replace ID-only lookups in `apps/web/src/lib/repositories/floor-plan-repository.ts` with project-scoped location/plan/marker/item resolvers and an association-exists query.
- [x] 2.2 Refactor `apps/web/src/lib/services/floor-plan-service.ts` to reuse ownership-chain guards before every read, StorageDriver call, and mutation; preserve safe 404/conflict envelopes.
- [x] 2.3 Run focused service/repository and route tests, then `pnpm typecheck`; record runtime isolation evidence.

## Phase 3: Maintenance Model and Migration (Later; Do Not Apply Now)

- [ ] 3.1 RED: add schema/integration tests for required IANA timezone, 30–365 horizon, relations, four WorkOrder statuses, and unique `(maintenancePlanId, occurrenceKey)`.
- [ ] 3.2 Add Project fields plus the MaintenancePlan, immutable effective-dated revision, revision checklist, WorkOrder, work-order checklist, generation-run, and activity models to `packages/database/prisma/schema.prisma`; create one additive migration without changing applied migrations.
- [ ] 3.3 Validate migration on isolated PostgreSQL, regenerate Prisma client, and update status docs; do not wire generator, calendar, panel, alerts, or onboarding.
