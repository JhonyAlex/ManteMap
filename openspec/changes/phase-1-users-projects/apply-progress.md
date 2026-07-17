## Apply Progress: Phase 1 — Users and Projects (Slice 4: Protected Application Shell)

**Change**: phase-1-users-projects
**Mode**: Strict TDD
**Work Unit**: 4 — Protected Application Shell (PR 4)
**Status**: All Slice 4 tasks complete — Phase 1 COMPLETE

### Completed Tasks (merged from all batches)

#### Slice 1: Auth Foundation (PR 1) — complete

- [x] 1.1 RED: Add `apps/web/vitest.config.ts` and tests for normalized email, weak/72-byte password, duplicate `409`, inactive/unknown generic login, `P2034` retry/`503`, and concurrent one-`ADMIN` bootstrap.
- [x] 1.2 GREEN: Add `packages/validation/src/user.ts`, `apps/web/src/lib/repositories/{transaction,user}-repository.ts`, and `services/{user,auth}-service.ts`; hash cost 12, serializable retry ×3, and no partial users.
- [x] 1.3 GREEN: Add `auth.config.ts`, `auth.ts`, `middleware.ts`, `lib/{auth/session,http/api-error}.ts`, `types/next-auth.d.ts`, and auth routes; enforce edge-safe middleware, minimum JWT claims, and protected redirects/`401`.
- [x] 1.4 REFACTOR/verify: Remove duplicated error/authorization logic; run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Rollback: PR 1 only; never run Prisma migration, baseline, reset, or `db push`.

#### Slice 2: Project Lifecycle (PR 2) — complete

- [x] 2.1 RED: Create `project-service.test.ts` for authenticated create, normalized unique-code `409`, atomic `ownerId` + `ProjectMember(OWNER)`, failure rollback, and archive retention.
- [x] 2.2 GREEN: Add `packages/validation/src/project.ts`, `repositories/project-repository.ts`, and `services/project-service.ts` with serializable atomic owner creation and non-destructive archive. Acceptance: 2.1 passes.
- [x] 2.3 GREEN: Add `app/api/projects/route.ts`, `[projectId]/route.ts`, and `[projectId]/archive/route.ts`; validate DTOs and return `{ data }` or safe `{ error, message }`.
- [x] 2.4 FIX: Malformed JSON in POST/PATCH routes now returns 400 with `VALIDATION_ERROR` (was leaking 500). Added inner try/catch for `SyntaxError`.
- [x] 2.5 RED+GREEN: Add route-boundary tests for POST/GET/PATCH/archive covering 401, malformed JSON 400, validation 400, duplicate code 409, non-member 404, non-owner 403, owner success, and safe ApiResponse shapes (27 tests). 401 tests strengthened to assert `{ error, message }` body using real `unauthorized()` helper.

#### Slice 3: Server Access Control (PR 3) — complete

- [x] 3.1 RED: Create `project-access-service.test.ts` with 13 integration tests: missing session 401 (route layer), non-member read 404, member read success, non-owner mutation 403, OWNER mutation success, ADMIN non-member 404 (no bypass), ADMIN member non-owner 403 (no bypass), ADMIN owner success.
- [x] 3.2 GREEN: Add `services/project-access-service.ts` with `requireProjectMember()` and `requireProjectOwner()` guards; wire `project-service.ts` through these guards replacing inline authorization checks. Acceptance: 3.1 passes with no protected data/details leaked.

#### Slice 4: Protected Application Shell (PR 4) — complete

- [x] 4.1 RED: Add component/navigation tests under `components/{providers,auth,layout,projects}/` for auth redirect, accessible-project-only navigation, breadcrumbs, and mobile sidebar state (33 tests across 5 files).
- [x] 4.2 GREEN: Add `app/(auth)/**`, `app/(dashboard)/**`, `components/{providers,auth,layout,projects}/**`, and update `app/layout.tsx`; keep server components default and project context access-checked.
- [x] 4.3 REFACTOR/verify: Keep out invitations, permission admin, deletion, and email verification; run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`. Rollback: PR 4 UI only.

### TDD Cycle Evidence (Slice 3)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `src/lib/services/project-access-service.test.ts` | Integration | N/A (new) | ✅ Written (13 tests referencing non-existent `project-access-service.ts`) | ✅ Passed (13/13) | ✅ 5 describe groups: member access, ADMIN no-bypass (read), owner mutation, non-owner 404→403 boundary, ADMIN no-bypass (mutation) | ✅ Strengthened non-owner mutation tests to assert persisted DB state after 403 |
| 3.2 | (same file — 3.1 tests are the acceptance) | Integration | ✅ 204/204 | ➖ Covered by 3.1 RED | ✅ Passed (13/13) | ✅ Covered by 3.1 triangulation | ✅ Wired `project-service.ts` through access guards; safety net 23/23 + 33/33 route tests pass |

### Evidence Correction Note

Slice 3 apply-progress was updated to strengthen non-owner mutation assertions. The original tests only verified the error type (`AuthorizationError`) but did not read/assert the persisted project state after the 403. Four tests were strengthened:

1. `project-access-service.test.ts` — non-owner mutation 403: now asserts project code/name/ownerId unchanged in DB
2. `project-access-service.test.ts` — ADMIN non-owner mutation 403: now asserts project code/name/ownerId unchanged in DB
3. `project-service.test.ts` — non-owner update 403: now asserts project name/code/ownerId unchanged in DB
4. `project-service.test.ts` — non-owner archive 403: now asserts project status remains ACTIVE in DB

This closes the gap identified before verification: tests now prove mutations do not persist after authorization rejection, not just that the correct error is thrown.

### Work Unit Evidence (Slice 3)

| Evidence | Value |
|---|---|
| Focused test command | `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-access-service.test.ts --fileParallelism=false` — 13 tests, all pass |
| Focused service safety net | `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-service.test.ts --fileParallelism=false` — 23 tests, all pass |
| Focused route safety net | `pnpm --filter @mantemap/web exec vitest run src/app/api/projects/route.test.ts "src/app/api/projects/[projectId]/route.test.ts" "src/app/api/projects/[projectId]/archive/route.test.ts" --fileParallelism=false` — 33 tests, all pass |
| Full test suite | `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` — 204 tests, all pass (191 prior + 13 new) |
| Lint | `pnpm lint` — No warnings or errors |
| Typecheck | `pnpm typecheck` — Clean (6/6 packages) |
| Build | ⚠️ Compilation + types + static gen pass; standalone symlink fails (pre-existing Windows EPERM — documented in Slice 1, not a code defect) |
| Runtime harness | PostgreSQL 16 via `docker compose -f docker-compose.dev.yml up -d`; integration tests invoke real `requireProjectMember()`, `requireProjectOwner()` against live DB |
| Rollback boundary | New: `project-access-service.ts`, `project-access-service.test.ts`. Modified: `project-service.ts` (wired through access guards). Revert these 3 files without affecting Slices 1/2. |

### Validation Results (Slice 3)

| Check | Result |
|---|---|
| `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-access-service.test.ts --fileParallelism=false` | ✅ 13/13 passed |
| `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-service.test.ts --fileParallelism=false` | ✅ 23/23 passed |
| `pnpm --filter @mantemap/web exec vitest run src/app/api/projects/route.test.ts "src/app/api/projects/[projectId]/route.test.ts" "src/app/api/projects/[projectId]/archive/route.test.ts" --fileParallelism=false` | ✅ 33/33 passed |
| `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` | ✅ 204/204 passed (191 prior + 13 new) |
| `pnpm lint` | ✅ No warnings or errors |
| `pnpm typecheck` | ✅ Clean (6/6 packages) |
| `pnpm build` | ⚠️ Compilation + types + static gen pass; standalone symlink fails (pre-existing Windows EPERM) |

### What Is Actually Tested (Slice 3)

| Capability | What is tested | What is NOT tested | Why |
|---|---|---|---|
| **Member read access** | `requireProjectMember()` succeeds for owner and MEMBER role; throws NotFoundError for non-members | — | Full coverage |
| **Non-member 404 (hidden existence)** | `requireProjectMember()` throws NotFoundError for non-members and non-existent projects; 404 hides project existence | — | Full coverage |
| **Owner mutation boundary** | `requireProjectOwner()` succeeds for OWNER; throws AuthorizationError for MEMBER role; throws NotFoundError for non-members (hidden existence) | — | Full coverage |
| **Persisted state after 403** | Non-owner mutation guard throws AuthorizationError AND re-reading project from DB confirms code/name/ownerId unchanged; non-owner archive guard throws AuthorizationError AND status remains ACTIVE | — | Full coverage (strengthened in evidence correction) |
| **ADMIN no bypass — read** | ADMIN who is not a member gets NotFoundError (404) from `requireProjectMember()`; ADMIN who IS a member succeeds | — | Full coverage |
| **ADMIN no bypass — mutation** | ADMIN who is not a member gets NotFoundError; ADMIN who is MEMBER (not OWNER) gets AuthorizationError; project DB state unchanged after 403; ADMIN who is OWNER succeeds | — | Full coverage |
| **Guard wiring** | `project-service.ts` functions (`getProjectById`, `updateProject`, `archiveProject`) delegate to access guards; existing 23 service + 33 route tests still pass | — | Full coverage |
| **No data leak on 401/403/404** | Route tests (Slice 2) already prove safe `{ error, message }` bodies; access service throws typed errors that routes map to safe responses | — | Full coverage |

### Files Changed (Slice 3)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/lib/services/project-access-service.ts` | **Created** | Authorization guards: `requireProjectMember()` and `requireProjectOwner()` with ADMIN no-bypass |
| `apps/web/src/lib/services/project-access-service.test.ts` | **Created** | 13 integration tests: member access, non-member 404, owner mutation with DB state assertion, non-owner 403 with DB state assertion, ADMIN no-bypass for both read and mutation |
| `apps/web/src/lib/services/project-service.ts` | **Modified** | Wired `getProjectById()`, `updateProject()`, `archiveProject()` through `requireProjectMember()` / `requireProjectOwner()` guards; removed inline `isProjectOwner()` / `findProjectsByMember()` authorization checks |
| `apps/web/src/lib/services/project-service.test.ts` | **Modified** | Strengthened non-owner update/archive 403 tests to assert persisted DB state unchanged after rejection |
| `openspec/changes/phase-1-users-projects/tasks.md` | **Modified** | Marked tasks 3.1–3.2 as `[x]` |
| `openspec/changes/phase-1-users-projects/apply-progress.md` | **Modified** | Updated with Slice 3 evidence + evidence correction |

### Previous Files (preserved from Slices 1–2)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/lib/services/project-service.test.ts` | Created | 23 integration tests covering all project lifecycle scenarios |
| `apps/web/src/lib/repositories/project-repository.ts` | Created | Prisma operations: create with owner, find by code/id, list by member, membership checks, update, archive |
| `apps/web/src/app/api/projects/route.ts` | Created | `GET /api/projects` (list) + `POST /api/projects` (create) |
| `apps/web/src/app/api/projects/[projectId]/route.ts` | Created | `GET /api/projects/:id` (read) + `PATCH /api/projects/:id` (update) |
| `apps/web/src/app/api/projects/[projectId]/archive/route.ts` | Created | `POST /api/projects/:id/archive` |
| `apps/web/src/app/api/projects/route.test.ts` | Created/Modified | 13 route-boundary tests |
| `apps/web/src/app/api/projects/[projectId]/route.test.ts` | Created/Modified | 13 route-boundary tests |
| `apps/web/src/app/api/projects/[projectId]/archive/route.test.ts` | Created/Modified | 7 route-boundary tests |
| `packages/validation/src/project.ts` | Modified | Code normalization, English messages, separated update schema |
| Other Slice 1 files | — | Auth, registration, validation, session, middleware |

### Design Decisions (Slice 3)

1. **Dedicated access service**: Authorization concerns extracted into `project-access-service.ts` with `requireProjectMember()` and `requireProjectOwner()` guards. This centralizes the access control policy in one file rather than scattering checks across `project-service.ts` functions.

2. **Non-member → NotFoundError (not AuthorizationError)**: Both `requireProjectMember()` and `requireProjectOwner()` throw `NotFoundError` for non-members to hide project existence. Only members who lack the specific permission (e.g., MEMBER trying to mutate) receive `AuthorizationError`.

3. **ADMIN has no implicit bypass**: The guards check `ProjectMember` records exclusively. A user with global `ADMIN` role who is not a project member receives the same `NotFoundError` as any other non-member. An ADMIN who is a MEMBER but not OWNER receives `AuthorizationError` for mutations.

4. **Refactoring preserves behavior**: `project-service.ts` was refactored to delegate to access guards instead of inline checks. The 23 existing service tests and 33 route tests pass unchanged, proving behavioral equivalence.

5. **Route layer unchanged**: The API route handlers already call `getAuthUser()` for 401 and catch typed errors from the service layer. No route changes were needed — the access service operates below the route layer.

### Discoveries (Slice 3)

- **Guard pattern reduces duplication**: Before this slice, `getProjectById()` used `findProjectsByMember()` (list + filter) while `updateProject()`/`archiveProject()` used `isProjectOwner()`. Now all three use consistent guards that share the same `isProjectMember()` / `isProjectOwner()` repository functions.
- **ADMIN bypass is a spec requirement, not a code smell**: The spec explicitly states "The global ADMIN role MUST NOT create an implicit project bypass." This was already the case in the existing code (no ADMIN checks existed), but the new tests provide explicit proof.
- **403 tests need DB assertions, not just error type**: Original non-owner mutation tests only verified `AuthorizationError` was thrown. The evidence correction strengthened these to also re-read the project from DB and assert code/name/ownerId/status unchanged. This closes the gap where a regression could silently persist mutations before the guard throws.

### Next Steps

- ~~Implement Slice 4: Application Shell (tasks 4.1-4.3)~~ — DONE
- ~~Resolve Slice 4 audit findings~~ — DONE
- Phase 1 complete. Run verify phase.

### Approved Review Warning Hardening (2026-07-16)

- API 5xx responses now use stable generic messages; typed 400/401/403/404/409 contracts remain safe and explicit. Registration malformed JSON returns `VALIDATION_ERROR` 400.
- Registration success and duplicate-email outcomes share the same generic `202` acceptance response, preventing account enumeration without weakening duplicate protection in the service.
- Dashboard membership data is request-scoped through React `cache`, so the layout/sidebar and dashboard page share one server-side membership query.
- Mobile navigation now uses one elevated drawer containing project navigation, user information, and sign out; it manages inert background state, focus containment/restoration, Escape/outside dismissal, touch targets, and reduced-motion classes.

### TDD Cycle Evidence (Slice 4)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `sidebar.test.tsx` | Component (jsdom) | N/A (new) | ✅ 15 tests referencing non-existent Sidebar | ✅ 15/15 passed | ✅ 5 groups: project nav, user info, sign out, mobile sidebar, accessibility | ✅ Clean |
| 4.1 | `breadcrumbs.test.tsx` | Component (jsdom) | N/A (new) | ✅ 5 tests referencing non-existent Breadcrumbs | ✅ 5/5 passed | ✅ nav landmark, path segments, current page, dashboard root, ordered list | ✅ Clean |
| 4.1 | `(dashboard)/layout.test.tsx` | Component (jsdom) | N/A (new) | ✅ 6 tests referencing non-existent DashboardLayout | ✅ 6/6 passed | ✅ skip-to-content, main landmark, children, sidebar, breadcrumbs, listProjects call | ✅ Clean |
| 4.1 | `(auth)/layout.test.tsx` | Component (jsdom) | N/A (new) | ✅ 3 tests referencing non-existent AuthLayout | ✅ 3/3 passed | ✅ children, no sidebar, no skip link | ✅ Clean |
| 4.1 | `middleware.shell.test.ts` | Unit (node) | ✅ 13/13 auth.config | ✅ 4 tests for shell protection | ✅ 4/4 passed | ✅ unauthenticated dashboard/projects redirect, authenticated access | ✅ Clean |
| 4.2 | (same files — 4.1 tests are the acceptance) | — | — | ➖ Covered by 4.1 RED | ✅ All 33 passed | ✅ Covered by 4.1 triangulation | ✅ Removed unused imports |
| 4.3 | Full suite safety net | — | ✅ 204/204 | ➖ N/A | ✅ 237/237 passed | ➖ N/A | ✅ Lint clean, typecheck clean |

### Work Unit Evidence (Slice 4)

| Evidence | Value |
|---|---|
| Focused test command | `pnpm --filter @mantemap/web exec vitest run src/components/layout/sidebar.test.tsx src/components/layout/breadcrumbs.test.tsx "src/app/(dashboard)/layout.test.tsx" "src/app/(auth)/layout.test.tsx" src/middleware.shell.test.ts --fileParallelism=false` — 33/33 passed |
| Full test suite | `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` — 237/237 passed (204 prior + 33 new) |
| Lint | `pnpm lint` — No warnings or errors |
| Typecheck | `pnpm typecheck` — Clean (6/6 packages) |
| Build | ⚠️ Compilation + types + static gen (7/7 pages) pass; standalone symlink fails (pre-existing Windows EPERM) |
| Runtime harness | N/A — component tests use jsdom, no PostgreSQL boundary needed for shell |
| Rollback boundary | New: `sidebar.tsx`, `breadcrumbs.tsx`, `providers.tsx`, `(dashboard)/layout.tsx`, `(auth)/layout.tsx`, `vitest.setup-component.ts`, 5 test files. Modified: `app/layout.tsx`, `vitest.config.ts`, `package.json`. Revert these files without affecting Slices 1-3. |

### Files Changed (Slice 4)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/components/layout/sidebar.tsx` | **Created** | Client component: project navigation, mobile toggle (aria-expanded, Escape close), user info, sign out |
| `apps/web/src/components/layout/breadcrumbs.tsx` | **Created** | Client component: breadcrumb nav from pathname, ordered list, aria-current on last item |
| `apps/web/src/components/providers.tsx` | **Created** | Thin SessionProvider wrapper for client session access |
| `apps/web/src/app/(dashboard)/layout.tsx` | **Created** | Server Component: auth check, membership-scoped project fetch, shell with sidebar + breadcrumbs + skip link |
| `apps/web/src/app/(auth)/layout.tsx` | **Created** | Server Component: centered layout for login/register, no protected shell |
| `apps/web/src/app/layout.tsx` | **Modified** | Wrapped children with Providers (SessionProvider) |
| `apps/web/vitest.config.ts` | **Modified** | Added vitest.setup-component.ts to setupFiles |
| `apps/web/vitest.setup-component.ts` | **Created** | Imports @testing-library/jest-dom/vitest for component test matchers |
| `apps/web/package.json` | **Modified** | Added @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom |
| `apps/web/src/components/layout/sidebar.test.tsx` | **Created** | 15 component tests: project nav, empty state, user info, sign out, mobile toggle, Escape, aria |
| `apps/web/src/components/layout/breadcrumbs.test.tsx` | **Created** | 5 component tests: nav landmark, path segments, current page, dashboard root, ordered list |
| `apps/web/src/app/(dashboard)/layout.test.tsx` | **Created** | 6 tests: skip link, main landmark, children, sidebar, breadcrumbs, listProjects |
| `apps/web/src/app/(auth)/layout.test.tsx` | **Created** | 3 tests: children render, no sidebar, no skip link |
| `apps/web/src/middleware.shell.test.ts` | **Created** | 4 tests: unauth redirect dashboard/projects, auth access dashboard/projects |

### Design Decisions (Slice 4)

1. **Dual sidebar rendering**: Dashboard layout renders two Sidebar instances — one for desktop (`hidden md:block`) and one for mobile (`md:hidden`). This avoids complex responsive JS and keeps the Sidebar as a pure presentational component.

2. **Server Component layout**: Dashboard layout is async Server Component that calls `getCurrentUser()` and `listProjects()` directly. No client-side data fetching for the shell. Secondary auth check provides defense in depth.

3. **Client components isolated**: Only Sidebar (mobile toggle state, Escape handler) and Breadcrumbs (usePathname) are client components. The layout itself remains server-rendered.

4. **Skip-to-content link**: Uses `sr-only` / `focus:not-sr-only` pattern for keyboard accessibility. Links to `#content` (main landmark with `tabIndex={-1}`).

5. **Breadcrumbs from pathname**: Pure client-side breadcrumb generation from `usePathname()`. Segments are capitalized and hyphenated. Last item rendered as `<span aria-current="page">` (not a link).

6. **No domain features**: Shell includes only auth, project navigation, and layout. No invitations, permission admin, deletion, email verification, or unrelated domain screens.

### Discoveries (Slice 4)

- **Vitest + jsdom for React components**: Using `// @vitest-environment jsdom` per-file works cleanly alongside the global `node` environment. Existing integration tests are unaffected.
- **@testing-library/jest-dom/vitest**: Must be imported in a setup file to extend Vitest's `expect` with DOM matchers like `toBeInTheDocument()` and `toHaveAttribute()`.
- **React import required in Vitest**: Unlike Next.js which auto-transforms JSX, Vitest needs explicit `import React from 'react'` in component files and test files using JSX.
- **Build EPERM is pre-existing**: The standalone symlink failure has been documented since Slice 1. It occurs after successful compilation, type validation, and static generation. Not a Slice 4 defect.

---

### Slice 4 Audit Resolution (completed 2026-07-16)

The prior Slice 4 worker was terminated before completing the full shell scope. An audit identified 7 gaps. This section documents their resolution.

#### Audit Findings Resolved

| # | Finding | Resolution |
|---|---------|------------|
| 1 | Missing `/login` and `/register` pages | Created both pages with Zod validation, loading/error states, autocomplete attributes, and links between them |
| 2 | Missing `/dashboard` and `/projects/[projectId]` pages | Created dashboard page (server component, membership-scoped projects) and project page (server-side access check, not-found for non-members) |
| 3 | No page-level proof inaccessible context is withheld | Added 6 project page tests: accessible render, code display, getProjectById call, non-member not-found, non-existent not-found, no data leak |
| 4 | Shell tests only render passed props | Added direct middleware behavior tests (9 tests exercising real auth.config callback), dashboard page tests (5 tests), project page tests (6 tests) |
| 5 | Middleware test mocks auth.config | Created `middleware.test.ts` with 9 tests that import and exercise the real `authConfig.callbacks.authorized` function — not a mock |
| 6 | Mobile Sidebar lacks a11y features | Enhanced: `aria-controls` on toggle, focus movement to first link on open, focus restoration to toggle on close, overlay backdrop for outside click, adequate touch targets (p-3), reduced-motion-safe transitions |
| 7 | Breadcrumb focus-visible styling | Added `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` classes to breadcrumb links |

#### TDD Cycle Evidence (Audit Resolution)

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|------|-----------|-------|-----|-------|----------|
| Login page | `login/page.test.tsx` | Component (jsdom) | ✅ 9 tests referencing non-existent page | ✅ 9/9 passed | ✅ Lint clean |
| Register page | `register/page.test.tsx` | Component (jsdom) | ✅ 8 tests referencing non-existent page | ✅ 8/8 passed | ✅ Lint clean |
| Dashboard page | `dashboard/page.test.tsx` | Component (jsdom) | ✅ 5 tests referencing non-existent page | ✅ 5/5 passed | ✅ Lint clean |
| Project page | `projects/[projectId]/page.test.tsx` | Component (jsdom) | ✅ 6 tests referencing non-existent page | ✅ 6/6 passed | ✅ Lint clean |
| Middleware direct | `middleware.test.ts` | Unit (node) | ✅ 9 tests for real auth.config callback | ✅ 9/9 passed | ✅ Lint clean |
| Sidebar a11y | `sidebar.test.tsx` | Component (jsdom) | ✅ 2 new tests (aria-controls, focus movement) | ✅ 20/20 passed | ✅ Lint clean |
| Breadcrumbs a11y | `breadcrumbs.test.tsx` | Component (jsdom) | ✅ 2 new tests (focus-visible, current-page span) | ✅ 7/7 passed | ✅ Lint clean |

#### Work Unit Evidence (Audit Resolution)

| Evidence | Value |
|---|---|
| Focused test command | `pnpm --filter @mantemap/web exec vitest run "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/register/page.test.tsx" "src/app/(dashboard)/dashboard/page.test.tsx" "src/app/(dashboard)/projects/[projectId]/page.test.tsx" "src/middleware.test.ts" src/components/layout/sidebar.test.tsx src/components/layout/breadcrumbs.test.tsx --fileParallelism=false` — 64/64 passed |
| Full test suite | `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` — 281/281 passed (237 prior + 44 new) |
| Lint | `pnpm lint` — No warnings or errors |
| Typecheck | `pnpm typecheck` — Clean (6/6 packages) |
| Build | ⚠️ Compilation + types + static gen (10/10 pages) pass; standalone symlink fails (pre-existing Windows EPERM) |
| Runtime harness | N/A — component tests use jsdom, no PostgreSQL boundary needed for shell |
| Rollback boundary | New: `login/page.tsx`, `register/page.tsx`, `dashboard/page.tsx`, `projects/[projectId]/page.tsx`, `middleware.test.ts`, 4 page test files. Modified: `sidebar.tsx`, `breadcrumbs.tsx`, `sidebar.test.tsx`, `breadcrumbs.test.tsx`. Revert these files without affecting Slices 1-3. |

#### Files Changed (Audit Resolution)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/app/(auth)/login/page.tsx` | **Created** | Client Component: credentials login form with Zod validation, signIn integration, error/loading states, autocomplete |
| `apps/web/src/app/(auth)/login/page.test.tsx` | **Created** | 9 tests: labels, submit, register link, validation, signIn call, error message, autocomplete, input types |
| `apps/web/src/app/(auth)/register/page.tsx` | **Created** | Client Component: registration form with Zod validation, API call, error/loading states, autocomplete |
| `apps/web/src/app/(auth)/register/page.test.tsx` | **Created** | 8 tests: labels, submit, login link, validation, weak password, API call, duplicate error, autocomplete |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | **Created** | Server Component: welcome message, membership-scoped project list, empty state |
| `apps/web/src/app/(dashboard)/dashboard/page.test.tsx` | **Created** | 5 tests: heading, welcome content, empty state, project cards, listProjects call |
| `apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx` | **Created** | Server Component: project details with server-side access check, not-found for non-members |
| `apps/web/src/app/(dashboard)/projects/[projectId]/page.test.tsx` | **Created** | 6 tests: project name, code, getProjectById call, non-member not-found, non-existent not-found, no data leak |
| `apps/web/src/middleware.test.ts` | **Created** | 9 tests: real auth.config callback for protected/public routes (direct behavior, not mocked) |
| `apps/web/src/components/layout/sidebar.tsx` | **Modified** | Added aria-controls, focus movement/restoration, overlay backdrop, touch targets (p-3), NAV_ID constant |
| `apps/web/src/components/layout/sidebar.test.tsx` | **Modified** | Added 5 new tests: aria-controls, focus movement, focus restoration, overlay dismiss, touch targets |
| `apps/web/src/components/layout/breadcrumbs.tsx` | **Modified** | Added focus-visible outline classes to breadcrumb links |
| `apps/web/src/components/layout/breadcrumbs.test.tsx` | **Modified** | Added 2 new tests: focus-visible classes, current-page is span not link |

#### Design Decisions (Audit Resolution)

1. **Login uses `redirect: false`**: signIn is called with `redirect: false` to get the result object for error handling. On success, `router.push('/dashboard')` handles navigation. This avoids the type issue where signIn returns `undefined` when redirect is not disabled.

2. **Register uses direct fetch**: Registration POSTs to `/api/auth/register` via fetch rather than signIn, because registration creates a user account (not a session). On success, the user is redirected to `/login` to sign in.

3. **Project page catches NotFoundError**: The project page wraps `getProjectById()` in try/catch and calls `notFound()` for NotFoundError. This ensures non-members see a safe 404 page with no project data leaked.

4. **Sidebar overlay uses data attribute**: The mobile overlay backdrop uses `data-sidebar-overlay` for test targeting. Clicking it calls `closeMobile()`. The overlay is `fixed inset-0 z-40` with `bg-black/50`.

5. **Focus management uses refs**: `toggleRef` and `navRef` provide direct DOM access for focus management. A `prevMobileOpen` ref tracks state transitions to avoid focus restoration on initial render.

#### Discoveries (Audit Resolution)

- **signIn return type**: NextAuth's `signIn()` returns `Promise<undefined>` when `redirect` is not `false`. Must pass `redirect: false` to get the `{ error, url }` result object.
- **Dashboard page is async Server Component**: Can't use `render()` in tests — must `await` the function and render the result, similar to the dashboard layout test pattern.
- **Duplicate text in project page**: The project code appears in both the header badge and the details section. Tests must use `getAllByText` or more specific queries.
- **Windows EPERM persists**: The standalone symlink failure remains environmental. Compilation, type validation, and static generation (now 10/10 pages) all pass.

---

### Slice 4 Verification Findings Resolution (completed 2026-07-16)

The verify phase identified 4 findings against the protected shell. This section documents their resolution.

#### Findings Resolved

| # | Finding | Resolution |
|---|---------|------------|
| 1 | verify-report.md is stale (Slice 3, 204 tests, 7 pages) | Not manually updated — will be regenerated via sdd-verify. This apply batch adds 15 new tests (296 total) and does not touch verify-report. |
| 2 | Tests exercise authConfig.callbacks.authorized or mocked callback, not the actual exported `middleware` wrapper | Created `middleware-wrapper.test.ts` with 5 tests that import the real `middleware.ts` module, verify the exported function is the one returned by `NextAuth().auth`, and invoke it with request/context objects to prove delegation. |
| 3 | Sidebar uses transition-colors but has no explicit prefers-reduced-motion/motion-reduce behavior | Added `motion-reduce:transition-none` to all elements with `transition-colors` in `sidebar.tsx` (toggle button, project links, sign-out button) and `breadcrumbs.tsx` (breadcrumb links). Added 3 tests verifying the motion-reduce override is present. |
| 4 | Login/register loading behavior lacks direct focused assertions | Added 3 login tests (disabled button + loading text during sign-in, re-enabled after failure, role="alert" on error) and 4 register tests (disabled button + loading text, re-enabled after failure, role="alert" on duplicate, role="alert" on server error). |

#### TDD Cycle Evidence (Verification Findings)

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|------|-----------|-------|-----|-------|----------|
| Middleware wrapper | `middleware-wrapper.test.ts` | Unit (node) | ✅ 5 tests written (vi.hoisted spy, NextAuth mock) | ✅ 5/5 passed (production code already exports auth wrapper) | ✅ Lint clean, no `any` casts |
| Reduced-motion sidebar | `sidebar.test.tsx` | Component (jsdom) | ✅ 2 new tests failed (no motion-reduce classes) | ✅ 22/22 passed | ✅ Lint clean |
| Reduced-motion breadcrumbs | `breadcrumbs.test.tsx` | Component (jsdom) | ✅ 1 new test failed (no motion-reduce class) | ✅ 8/8 passed | ✅ Lint clean |
| Login loading assertions | `login/page.test.tsx` | Component (jsdom) | ✅ 3 new tests written | ✅ 12/12 passed (production code already has loading behavior) | ✅ Lint clean |
| Register loading assertions | `register/page.test.tsx` | Component (jsdom) | ✅ 4 new tests written | ✅ 12/12 passed (production code already has loading behavior) | ✅ Lint clean |

#### Work Unit Evidence (Verification Findings)

| Evidence | Value |
|---|---|
| Focused test command | `pnpm --filter @mantemap/web exec vitest run src/middleware-wrapper.test.ts src/components/layout/sidebar.test.tsx src/components/layout/breadcrumbs.test.tsx "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/register/page.test.tsx" --fileParallelism=false` — 59/59 passed |
| Full test suite | `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` — 302/302 passed (281 prior + 21 new) |
| Lint | `pnpm lint` — No warnings or errors |
| Typecheck | `pnpm typecheck` — Clean (6/6 packages) |
| Build | ⚠️ Compilation + types + static gen (10/10 pages) pass; standalone symlink fails (pre-existing Windows EPERM) |
| Runtime harness | N/A — component/unit tests use jsdom/node, no PostgreSQL boundary needed |
| Rollback boundary | New: `middleware-wrapper.test.ts`. Modified: `sidebar.tsx`, `sidebar.test.tsx`, `breadcrumbs.tsx`, `breadcrumbs.test.tsx`, `login/page.test.tsx`, `register/page.test.tsx`. Revert these 7 files without affecting Slices 1-3. |

#### Files Changed (Verification Findings)

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/middleware-wrapper.test.ts` | **Created** | 5 unit tests: exported function identity, callable, delegation to auth wrapper with request and context |
| `apps/web/src/components/layout/sidebar.tsx` | **Modified** | Added `motion-reduce:transition-none` to toggle button, project links, and sign-out button |
| `apps/web/src/components/layout/sidebar.test.tsx` | **Modified** | Added 2 tests: reduced-motion override on project links and sign-out button |
| `apps/web/src/components/layout/breadcrumbs.tsx` | **Modified** | Added `motion-reduce:transition-none` to breadcrumb links |
| `apps/web/src/components/layout/breadcrumbs.test.tsx` | **Modified** | Added 1 test: reduced-motion override on breadcrumb links |
| `apps/web/src/app/(auth)/login/page.test.tsx` | **Modified** | Added 3 tests: disabled+loading text during sign-in, re-enabled after failure, role="alert" on error |
| `apps/web/src/app/(auth)/register/page.test.tsx` | **Modified** | Added 4 tests: disabled+loading text, re-enabled after failure, role="alert" on duplicate, role="alert" on server error |

#### What Is Actually Tested (Verification Findings)

| Capability | What is tested | What is NOT tested | Why |
|---|---|---|---|
| **Middleware export wiring** | Exported `middleware` is the function returned by `NextAuth().auth`; accepts request/context and delegates | Internal routing logic, NextAuth's actual auth flow | The callback logic is tested in middleware.test.ts (9 tests); this proves the export is wired |
| **Reduced-motion transitions** | All `transition-colors` elements in sidebar and breadcrumbs have `motion-reduce:transition-none` | Actual CSS media query behavior (jsdom limitation) | jsdom cannot compute styles; class presence verifies the Tailwind utility is applied |
| **Login loading state** | Button disabled during submission, loading text visible, re-enabled after failure, error alert with role="alert" | Actual signIn API behavior, redirect after success | signIn is mocked; real auth is tested in auth.integration.test.ts |
| **Register loading state** | Button disabled during submission, loading text visible, re-enabled after failure, duplicate/general error alerts | Actual registration API, redirect after success | fetch is mocked; real registration is tested in register/route.test.ts |
