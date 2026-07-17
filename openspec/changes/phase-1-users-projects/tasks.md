# Tasks: Phase 1 — Users and Projects

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,850–2,450 total; 350–700/unit |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Auth foundation | PR 1 | `pnpm --filter @mantemap/web test -- src/lib/services/user-service.test.ts src/lib/services/auth-service.test.ts` | Disposable PostgreSQL: `docker compose -f docker-compose.dev.yml up -d postgres` | Auth, registration, validation, test-config files |
| 2 | Project lifecycle | PR 2 | `pnpm --filter @mantemap/web test -- src/lib/services/project-service.test.ts` | PostgreSQL project create/archive scenario | Project repository/service/routes/tests |
| 3 | Access control | PR 3 | `pnpm --filter @mantemap/web test -- src/lib/services/project-access-service.test.ts` | Authenticated member/non-member API requests | Access service, guards, scoped routes/tests |
| 4 | Protected shell | PR 4 | `pnpm --filter @mantemap/web test -- src/components` | `pnpm --filter @mantemap/web dev` then mobile/desktop navigation smoke | Auth/dashboard UI, providers, shell tests |

## Phase 1: Auth Foundation (depends on existing Prisma schema; no schema operation)

- [x] 1.1 RED: Add `apps/web/vitest.config.ts` and tests for normalized email, weak/72-byte password, duplicate `409`, inactive/unknown generic login, `P2034` retry/`503`, and concurrent one-`ADMIN` bootstrap.
- [x] 1.2 GREEN: Add `packages/validation/src/user.ts`, `apps/web/src/lib/repositories/{transaction,user}-repository.ts`, and `services/{user,auth}-service.ts`; hash cost 12, serializable retry ×3, and no partial users. Acceptance: RED tests pass.
- [x] 1.3 GREEN: Add `auth.config.ts`, `auth.ts`, `middleware.ts`, `lib/{auth/session,http/api-error}.ts`, `types/next-auth.d.ts`, and auth routes; enforce edge-safe middleware, minimum JWT claims, and protected redirects/`401`.
- [x] 1.4 REFACTOR/verify: Remove duplicated error/authorization logic; run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Rollback: PR 1 only; never run Prisma migration, baseline, reset, or `db push`.

## Phase 2: Project Lifecycle (depends on 1.2–1.3)

- [x] 2.1 RED: Create `project-service.test.ts` for authenticated create, normalized unique-code `409`, atomic `ownerId` + `ProjectMember(OWNER)`, failure rollback, and archive retention.
- [x] 2.2 GREEN: Add `packages/validation/src/project.ts`, `repositories/project-repository.ts`, and `services/project-service.ts` with serializable atomic owner creation and non-destructive archive. Acceptance: 2.1 passes.
- [x] 2.3 GREEN: Add `app/api/projects/route.ts`, `[projectId]/route.ts`, and `[projectId]/archive/route.ts`; validate DTOs and return `{ data }` or safe `{ error, message }`.
- [x] 2.4 FIX: Malformed JSON in POST/PATCH routes now returns 400 with `VALIDATION_ERROR` (was leaking 500). Added inner try/catch for `SyntaxError`.
- [x] 2.5 RED+GREEN: Add route-boundary tests for POST/GET/PATCH/archive covering 401, malformed JSON 400, validation 400, duplicate code 409, non-member 404, non-owner 403, owner success, and safe ApiResponse shapes (27 tests).

## Phase 3: Server Access Control (depends on 2.2–2.3)

- [x] 3.1 RED: Create `project-access-service.test.ts` and route tests: missing session `401`; non-member read `404`; member read succeeds; non-owner mutation `403`; OWNER mutation succeeds; ADMIN has no bypass.
- [x] 3.2 GREEN: Add `services/project-access-service.ts` and wire every scoped project handler through session/membership checks. Acceptance: 3.1 passes with no protected data/details leaked.

## Phase 4: Protected Application Shell (depends on 1.3, 2.3, 3.2)

- [x] 4.1 RED: Add component/navigation tests under `components/{providers,auth,layout,projects}/` for auth redirect, accessible-project-only navigation, breadcrumbs, and mobile sidebar state.
- [x] 4.2 GREEN: Add `app/(auth)/**`, `app/(dashboard)/**`, `components/{providers,auth,layout,projects}/**`, and update `app/layout.tsx`; keep server components default and project context access-checked.
- [x] 4.3 REFACTOR/verify: Keep out invitations, permission admin, deletion, and email verification; run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Rollback: PR 4 UI only.
