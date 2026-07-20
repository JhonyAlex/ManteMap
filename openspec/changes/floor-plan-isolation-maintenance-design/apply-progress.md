# Apply Progress: Floor Plan Isolation — Work Unit 1

## Completed Tasks

- [x] 1.1 Foreign location/plan tests cover upload, list, detail, image, and delete without storage or mutation side effects.
- [x] 1.2 Marker tests cover foreign plans, plan-marker mismatches, foreign items, and duplicate same-plan item associations.
- [x] 2.1 Added project-scoped location, plan, marker, and item resolvers plus duplicate-association lookup.
- [x] 2.2 Split plan, marker, and ownership responsibilities; every storage call and mutation follows the ownership guard.
- [x] 2.3 Focused tests and web typecheck completed.

## TDD Cycle Evidence

| Task | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| 1.1 | 57 service tests passed | 6 new isolation tests failed (foreign location/plan paths resolved instead of rejecting) | 63 service tests passed | Upload/list and detail/image/delete exercise distinct read and side-effect boundaries | Extracted plan ownership and storage logic |
| 1.2 | 57 service tests passed | Foreign-plan, marker mismatch, foreign-item, and duplicate-association cases failed | 63 service tests passed | Create and reassignment both validate item ownership/duplicate conflicts | Extracted marker ownership and mutation logic |
| 2.1–2.2 | 16 repository tests passed | Covered by service RED contract | 16 repository + 63 service tests passed | Project, plan, marker, and item resolver paths are independent | Service facade reduced to focused module exports |
| 2.3 | N/A | N/A | Focused tests passed; `@mantemap/web` typecheck passed | N/A | N/A |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @mantemap/web exec vitest run src/lib/services/floor-plan-service.test.ts` — exit 0, 63 passed; repository command — exit 0, 16 passed |
| Runtime harness | Service-level mocked storage/repository isolation scenarios — 6 negative cases passed; API route runtime harness is deferred because routes already delegate to these service boundaries and no authenticated DB harness is available in this work unit |
| Typecheck | `pnpm --filter @mantemap/web typecheck` — exit 0 |
| Rollback boundary | Revert `apps/web/src/lib/repositories/floor-plan-repository.ts`, the four floor-plan service modules, and `floor-plan-service.test.ts`; no schema or persisted-data changes |

## Known Validation Note

Root `pnpm typecheck` remains blocked by an unrelated existing `packages/shared/src/types/metrics.test.ts` missing `vitest` module/types. The affected web package typecheck passes.

## Follow-up Evidence: Isolation Contract Hardening

- Extended the existing mocked two-project rejection matrix without changing production behavior. The tests now assert the exact project-scoped location, plan, marker, and item resolver calls; foreign location, plan, marker, and item inputs must stop before storage or create/update/delete operations.
- Added a dedicated foreign-item-on-marker-modification case that proves `updateMarkerWithAssociation` is not reached after the project-scoped item resolver rejects it.
- Terminal review receipt remains pending; this evidence update does not reopen the deferred maintenance scope.

| Evidence | Result |
|---|---|
| Focused isolation suite | `pnpm --filter @mantemap/web exec vitest run src/lib/repositories/floor-plan-repository.test.ts src/lib/services/floor-plan-service.test.ts src/app/api/projects/[projectId]/floor-plans/route.test.ts` — exit 0; 106 passed across 3 files. |
| Web typecheck | `pnpm --filter @mantemap/web typecheck` — exit 0. |
| Runtime harness | N/A — no authenticated two-project PostgreSQL harness is available; mocked service/repository contracts cover the isolation boundary without live DB dependence. |

## Bounded Review Correction — `review-d63e03c169c4bd21`

- Replaced the service-level duplicate pre-check with repository operations that perform the lookup and marker create/reassignment in one `runSerializable` transaction. PostgreSQL serialization failures receive the existing bounded P2034 retry; a retry observes the committed association and returns the existing `ConflictError` semantics.
- Marker POST and PATCH now map `ConflictError` to HTTP 409.

### TDD Cycle Evidence

| RED | GREEN | REFACTOR |
|---|---|---|
| Added atomic repository and route-conflict tests; focused run failed with 5 expected failures: missing atomic operations, services still used non-atomic writes, and routes returned 500 instead of 409. | `pnpm --filter @mantemap/web exec vitest run src/lib/repositories/floor-plan-repository.test.ts src/lib/services/floor-plan-service.test.ts src/app/api/projects/[projectId]/floor-plans/route.test.ts` — exit 0; 3 files, 104 tests passed. | Reused the existing `runSerializable` helper; no schema or migration change. |

### Correction Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @mantemap/web exec vitest run src/lib/repositories/floor-plan-repository.test.ts src/lib/services/floor-plan-service.test.ts src/app/api/projects/[projectId]/floor-plans/route.test.ts` — exit 0; 104 passed. |
| Runtime harness | N/A — the affected persistence boundary is represented by the repository transaction unit test; no authenticated PostgreSQL API harness is available in this work unit. |
| Typecheck | `pnpm --filter @mantemap/web typecheck` — exit 0. |
| Rollback boundary | Revert only the atomic marker-association repository operations, marker service wiring, marker route conflict mapping, and their focused tests; no schema or persisted data changes. |
