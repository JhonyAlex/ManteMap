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

## Definitive Validation and Review Receipt

The completed isolation unit was validated at commit `6b103f4850a0e0bb1ae1c41138fcd33cb8ea29ea` (`6b103f4`, `fix: enforce project isolation and atomic marker associations`). Its final native review lineage is `review-floor-plan-isolation-evidence-v3`, with terminal result `post-apply: allow`.

| Evidence | Definitive result |
|---|---|
| Focused isolation suite | `pnpm --filter @mantemap/web exec vitest run src/lib/repositories/floor-plan-repository.test.ts src/lib/services/floor-plan-service.test.ts src/app/api/projects/[projectId]/floor-plans/route.test.ts` — exit 0; **106 passed** across the three files. |
| Files run | `apps/web/src/lib/repositories/floor-plan-repository.test.ts`; `apps/web/src/lib/services/floor-plan-service.test.ts`; `apps/web/src/app/api/projects/[projectId]/floor-plans/route.test.ts`. |
| Web typecheck | `pnpm --filter @mantemap/web typecheck` — exit 0. |
| Native review | `review-floor-plan-isolation-evidence-v3` — `post-apply: allow`. |
| PostgreSQL concurrency | Not executed with real PostgreSQL in this unit. The serializable transaction behavior has mocked/repository coverage only; the next migration unit must prove database-level concurrency and the final partial unique constraint. |
| Rollback boundary | Revert the floor-plan repository/service/route changes and focused tests from the validated commit; this unit created no schema or persisted-data change. |
