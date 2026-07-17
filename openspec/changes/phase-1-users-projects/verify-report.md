```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:657183d75d4deb72760ab440208499b4b196262b1e058c9e6c7ec8241989e0f9
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 14/14
scenarios: 20/20
test_command: pnpm --filter @mantemap/web exec vitest run --fileParallelism=false
test_exit_code: 0
test_output_hash: sha256:a9ee5bc5b3e8d1727e954b4d3b58f4b162bbc2830c98fe9cf33be0e7ff60b71a
build_command: pnpm build
build_exit_code: 1
build_output_hash: sha256:87eaa5eb8660b1d21ce14bedd5ea95601ba193c9870937eb55ae439679c7d4d4
```

## Verification Report

**Change**: `phase-1-users-projects`  
**Scope**: Complete Phase 1 after Slice 4, covering Auth Foundation, Project Lifecycle, Server Access Control, and Protected Application Shell.  
**Mode**: Strict TDD; OpenSpec + Engram persistence requested; stacked-to-main delivery plan.  
**Status source**: Native `gentle-ai sdd-status` reported 14/14 tasks complete. Its absent review transaction blocks archive routing, not this evidence refresh.

### Completeness

| Metric | Value |
|---|---:|
| Phase 1 tasks total | 14 |
| Phase 1 tasks complete | 14 |
| Phase 1 tasks incomplete | 0 |
| Specifications | 4 |
| Requirements | 14 |
| Scenarios | 20 |
| Out-of-scope schema/migration operations | 0 observed |

All task checkboxes in `tasks.md` are complete. The inspected change paths contain no Prisma schema, migration, baseline, reset, or `db push` operation. The application source exposes only authentication, project lifecycle, member-scoped authorization, and shell navigation; it introduces no invitations, role-administration UI, destructive project deletion, email verification, SMTP, OAuth, or password-reset feature.

### Build & Tests Execution

| Check | Command | Result | Output hash |
|---|---|---|---|
| Fresh serial full suite | `pnpm --filter @mantemap/web exec vitest run --fileParallelism=false` | ✅ 296/296 passed, 27 files, exit 0 | `sha256:a9ee5bc5b3e8d1727e954b4d3b58f4b162bbc2830c98fe9cf33be0e7ff60b71a` |
| Focused Slice 4 shell | `pnpm --filter @mantemap/web exec vitest run src/middleware-wrapper.test.ts src/components/layout/sidebar.test.tsx src/components/layout/breadcrumbs.test.tsx "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/register/page.test.tsx" --fileParallelism=false` | ✅ 59/59 passed, exit 0 | `sha256:cb0da2152fbf6c96f470bff779aa269c44051ba1a7cc8faf9b6c0275b2618ceb` |
| Focused access control | `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-access-service.test.ts --fileParallelism=false` | ✅ 13/13 passed, exit 0 | `sha256:5f0e8765dabab92a970327326692a615f418d2d39e1c1004ebc44bb71b47e2dc` |
| Focused project lifecycle/routes | `pnpm --filter @mantemap/web exec vitest run src/lib/services/project-service.test.ts src/app/api/projects/route.test.ts "src/app/api/projects/[projectId]/route.test.ts" "src/app/api/projects/[projectId]/archive/route.test.ts" --fileParallelism=false` | ✅ 56/56 passed, exit 0 | `sha256:cee00225872fb3b9d9ee1afa2989bc33bff508800f3a1fea568428a4a5274397` |
| Focused authentication | `pnpm --filter @mantemap/web exec vitest run src/auth.config.test.ts src/auth.integration.test.ts src/auth.providers.test.ts src/lib/services/user-service.test.ts src/lib/services/user-service.integration.test.ts src/lib/services/auth-service.test.ts src/lib/repositories/transaction-repository.test.ts src/lib/auth/session.test.ts src/app/api/auth/register/route.test.ts --fileParallelism=false` | ✅ 111/111 passed, exit 0 | `sha256:a3e0fb94391956bbaddee192acd9b04a6dc90066367b3446c1449b8950d8c7f4` |
| Lint | `pnpm lint` | ✅ no warnings or errors, exit 0 | `sha256:ccb8ca67a91ce566c19dff82c3d66041093b98c2bc792f1f4e67a3d5f8775086` |
| Typecheck | `pnpm typecheck` | ✅ 6/6 packages, exit 0 | `sha256:40a427b009f6a0ef1a358cf8ff609826a2c55834e9d18c6e8ad670aa4a8546b3` |
| Build | `pnpm build` | ⚠️ exit 1 only during standalone symlink copy, after successful compile, type validation, and static generation of 10/10 pages | `sha256:87eaa5eb8660b1d21ce14bedd5ea95601ba193c9870937eb55ae439679c7d4d4` |

The build compiled successfully, completed Next.js type validation, and generated all 10 static pages. It then failed copying standalone traced dependencies because Windows denied symlink creation (`EPERM`, `errno -4048`). This is classified as the instructed environmental limitation, not a Phase 1 implementation failure. A symlink-capable packaging environment is still required to produce the standalone deployment artifact.

**Coverage**: ➖ Skipped. No Vitest coverage provider is installed or configured.

### Spec Compliance Matrix

| Requirement | Scenario | Passing runtime coverage | Result |
|---|---|---|---|
| Credentials registration and validation | Valid registration | Real PostgreSQL registration, registration route, and provider integration tests create an active user with normalized email and safe data. | ✅ COMPLIANT |
| Credentials registration and validation | Invalid or duplicate registration | Validation, registration route, and real-service duplicate tests cover weak/over-72-byte password, invalid email, normalized duplicate, 400, and 409 behavior. | ✅ COMPLIANT |
| Atomic first-user bootstrap | Concurrent empty-system registration | Real PostgreSQL `user-service.integration.test.ts` proves concurrent registration results in exactly one ADMIN and no partial account. | ✅ COMPLIANT |
| Atomic first-user bootstrap | Database failure during registration | Deterministic and real `P2034` tests plus injected pre-commit failures prove bounded retry/rollback; the route maps exhaustion to safe 503. | ✅ COMPLIANT |
| Authentication sessions and protected routes | Valid and invalid login | Real PostgreSQL Credentials-provider tests cover valid, unknown, wrong-password, inactive, malformed credentials, minimal claims, JWT, and session mapping. | ✅ COMPLIANT |
| Authentication sessions and protected routes | Invalid session on protected access | Session helpers, project route 401 contracts, real middleware callback behavior, and wrapper wiring tests pass. | ✅ COMPLIANT |
| Deferred verification scope | Registration without verification | Passing registration integration/route tests create ACTIVE accounts and complete the in-scope credentials flow without any verification prerequisite. | ✅ COMPLIANT |
| Authenticated project lifecycle | Create and manage a project | Real PostgreSQL project-service tests cover normalized creation, member list/read, owner update, archive, and retained data. | ✅ COMPLIANT |
| Authenticated project lifecycle | Unauthenticated lifecycle request | Collection, scoped read/update, and archive route tests return safe 401 results before project services run. | ✅ COMPLIANT |
| Atomic creator ownership | Owner membership is created with the project | Real transaction test verifies `ownerId` and `ProjectMember(OWNER)` exist together. | ✅ COMPLIANT |
| Atomic creator ownership | Project transaction failure | Injected pre-commit failure proves neither project nor membership persists; route tests prove safe failure responses. | ✅ COMPLIANT |
| Project code uniqueness | Duplicate project code | Real service tests cover normalized duplicates and unchanged counts; collection route maps conflict to 409. | ✅ COMPLIANT |
| Deferred destructive and schema operations | Archive request | Real service/archive-route tests assert `ARCHIVED`, retained project data, and retained membership. | ✅ COMPLIANT |
| Membership-scoped project access | Member reads a project | Real access/service tests prove OWNER and MEMBER reads, with scoped GET route success. | ✅ COMPLIANT |
| Membership-scoped project access | Non-member reads a project | Real access/service tests produce `NotFoundError`; scoped GET route returns 404 without data. | ✅ COMPLIANT |
| Owner mutation boundary | Owner mutation | Real owner update/archive tests and PATCH/archive route success contracts pass. | ✅ COMPLIANT |
| Owner mutation boundary | Non-owner mutation | Real MEMBER and ADMIN-MEMBER checks produce 403 and reread unchanged project fields/status; routes map safely to 403. | ✅ COMPLIANT |
| Access failure safety | Invalid session on project API | GET, POST, PATCH, and archive route tests verify safe `AUTHENTICATION_ERROR` 401 bodies with no protected payload. | ✅ COMPLIANT |
| Protected application shell | Authenticated workspace navigation | Dashboard/layout/page tests render server-fetched accessible projects, sidebar, breadcrumbs, main landmark, and project content. | ✅ COMPLIANT |
| Protected application shell | Unauthenticated shell request | Real `authConfig.callbacks.authorized` tests reject protected paths; `middleware-wrapper.test.ts` proves the exported NextAuth wrapper delegates correctly. | ✅ COMPLIANT |
| Responsive and accessible navigation | Mobile workspace use | Passing jsdom Sidebar tests cover toggle state, Escape/outside dismissal, focus movement/restoration, current context, accessible destinations, and reduced-motion utility overrides. | ✅ COMPLIANT |
| Responsive and accessible navigation | Inaccessible context | Project-page tests exercise the server component's `NotFoundError` path and prove no previously-rendered project name/code is exposed. | ✅ COMPLIANT |
| Out-of-scope shell features | Scope-preserving navigation | Passing shell navigation tests exercise the available auth/project/navigation actions; source audit finds no out-of-scope controls or capabilities. | ✅ COMPLIANT |

**Compliance summary**: 20/20 scenarios compliant across 14/14 requirements.

### Correctness (Static Evidence)

| Area | Status | Notes |
|---|---|---|
| Auth security | ✅ Implemented | Zod normalization, bcrypt cost 12, 72-byte limit, generic failures, dummy hash comparison, ACTIVE check, minimal JWT/session claims, and edge-safe auth configuration are present. |
| Bootstrap atomicity | ✅ Implemented | Password hashing occurs outside a serializable transaction; `countUsers` plus creation runs inside bounded `P2034` retry logic. |
| Project atomic ownership | ✅ Implemented | One serializable transaction creates the project and its OWNER membership. |
| Route contracts | ✅ Implemented | Registration and project handlers validate input and map typed failures to safe `{ data?, error?, message? }` responses. |
| Server access control | ✅ Implemented | API routes require a session; service guards require membership for reads and OWNER for mutation. ADMIN has no implicit project bypass. |
| Context withholding | ✅ Implemented | Dashboard/list navigation derives from member-scoped projects; the project page server-calls `getProjectById()` and converts `NotFoundError` to `notFound()`. |
| Shell accessibility | ✅ Implemented | Native landmarks, skip link to focusable main content, labelled navigation, `aria-current`, mobile focus handling, Escape/outside dismissal, focus-visible affordances, and `motion-reduce:transition-none` are present. |
| Atomic ownership boundary | ✅ Implemented | Repository creates `Project.ownerId` and `ProjectMember(OWNER)` as two writes in the transaction callback; injected commit failures roll both back in runtime tests. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| JWT only contains identity and global role | ✅ Yes | Auth/provider/session tests assert exactly `id`, email, name, and role at the session boundary, with `sub` as the token identity. |
| Edge-safe middleware isolation | ✅ Yes | `auth.config.ts` contains no Prisma/bcrypt imports; Node-only Credentials wiring remains in `auth.ts`. |
| Serializable bootstrap and ownership | ✅ Yes | Both user bootstrap and project creation use `runSerializable`; retry is constrained to `P2034`. |
| Server-authoritative authorization | ✅ Yes | UI filtering is defense in depth only; every API route and scoped service operation rechecks session/membership. |
| Members read, OWNER mutates, ADMIN has no bypass | ✅ Yes | Centralized guards produce 404 for non-members and 403 for non-owner members, including ADMIN members. |
| Server Components by default | ✅ Yes | Dashboard layout/page and project page are server components; form/navigation state and SessionProvider are isolated client boundaries. |
| No schema operation | ✅ Yes | No schema/migration files or schema commands are part of the inspected change. |
| Scope boundary | ✅ Yes | No invitations, role-admin controls, destructive deletion, email verification, SMTP, OAuth, or password-reset features were observed. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | `apply-progress.md` contains explicit TDD cycle tables for Slices 3 and 4 and task-level RED/GREEN descriptions for Slices 1 and 2. |
| All tasks have test evidence | ✅ | 14/14 complete tasks map to current tests; the full serial suite passed 296/296. |
| RED confirmed | ✅ | Auth, lifecycle, access, route, middleware, layout, page, sidebar, and breadcrumb test files exist. |
| GREEN confirmed | ✅ | Focused shell 59/59, access 13/13, project/routes 56/56, auth 111/111, and full serial 296/296 all passed. |
| Triangulation adequate | ✅ | Tests vary valid/invalid actor, role, membership, archive/update, safe route failures, transaction rollback/retry, desktop/mobile interaction, and inaccessible context. |
| Safety Net for modified files | ⚠️ | Current suites pass, but this uncommitted worktree cannot independently reconstruct historical pre-edit safety-net execution for Slices 1 and 2. |

**TDD compliance**: 5/6 current-verifiable checks passed; the sole warning is historical evidence granularity, not a current behavior failure.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit / route-boundary | 127 | 14 | Vitest, mocked seams where HTTP/auth boundaries are isolated |
| Integration | 95 | 5 | Vitest + disposable PostgreSQL/Prisma |
| Component | 74 | 8 | Vitest + jsdom + Testing Library |
| E2E | 0 | 0 | Playwright is declared, but no Phase 1 E2E configuration/suite is present |
| **Total** | **296** | **27** | |

### Changed File Coverage

Coverage analysis skipped: no Vitest coverage provider is configured.

### Assertion Quality

| File | Lines | Assertion style | Issue | Severity |
|---|---:|---|---|---|
| `apps/web/src/components/layout/sidebar.test.tsx` | 255-284 | Tailwind class assertions | Touch-target and reduced-motion tests inspect implementation utilities because jsdom cannot calculate layout/media-query behavior. | WARNING |
| `apps/web/src/components/layout/breadcrumbs.test.tsx` | 73-101 | Tailwind class assertions | Focus-visible and reduced-motion utility presence is implementation-coupled. | WARNING |

No tautologies, assertion-only tests, empty-result ghost loops, or tests that omit production/component execution were found. The class-level warnings are non-blocking and are appropriate short-term coverage for jsdom's CSS limitations; browser-level accessibility and responsive validation remains a future E2E concern.

### Quality Metrics

**Linter**: ✅ No warnings or errors.  
**Type checker**: ✅ No errors in 6/6 packages.

### Canonical Verification Evidence

The following fenced content is the exact UTF-8 preimage for `evidence_revision` (1,811 bytes, LF separators, no trailing newline):

```text
full_tests_serial|pnpm --filter @mantemap/web exec vitest run --fileParallelism=false|0|sha256:a9ee5bc5b3e8d1727e954b4d3b58f4b162bbc2830c98fe9cf33be0e7ff60b71a
focused_shell|pnpm --filter @mantemap/web exec vitest run src/middleware-wrapper.test.ts src/components/layout/sidebar.test.tsx src/components/layout/breadcrumbs.test.tsx "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/register/page.test.tsx" --fileParallelism=false|0|sha256:cb0da2152fbf6c96f470bff779aa269c44051ba1a7cc8faf9b6c0275b2618ceb
focused_access|pnpm --filter @mantemap/web exec vitest run src/lib/services/project-access-service.test.ts --fileParallelism=false|0|sha256:5f0e8765dabab92a970327326692a615f418d2d39e1c1004ebc44bb71b47e2dc
focused_project|pnpm --filter @mantemap/web exec vitest run src/lib/services/project-service.test.ts src/app/api/projects/route.test.ts "src/app/api/projects/[projectId]/route.test.ts" "src/app/api/projects/[projectId]/archive/route.test.ts" --fileParallelism=false|0|sha256:cee00225872fb3b9d9ee1afa2989bc33bff508800f3a1fea568428a4a5274397
focused_auth|pnpm --filter @mantemap/web exec vitest run src/auth.config.test.ts src/auth.integration.test.ts src/auth.providers.test.ts src/lib/services/user-service.test.ts src/lib/services/user-service.integration.test.ts src/lib/services/auth-service.test.ts src/lib/repositories/transaction-repository.test.ts src/lib/auth/session.test.ts src/app/api/auth/register/route.test.ts --fileParallelism=false|0|sha256:a3e0fb94391956bbaddee192acd9b04a6dc90066367b3446c1449b8950d8c7f4
lint|pnpm lint|0|sha256:ccb8ca67a91ce566c19dff82c3d66041093b98c2bc792f1f4e67a3d5f8775086
typecheck|pnpm typecheck|0|sha256:40a427b009f6a0ef1a358cf8ff609826a2c55834e9d18c6e8ad670aa4a8546b3
build|pnpm build|1|sha256:87eaa5eb8660b1d21ce14bedd5ea95601ba193c9870937eb55ae439679c7d4d4
```

### Issues Found

**CRITICAL**: None.

**WARNING**:

- `pnpm build` exits 1 only while Windows creates standalone-output symlinks. Compile, type validation, and static generation of 10/10 pages completed first. This does not prove a deployable standalone artifact on this host.
- Logout is represented by the shell's `signOut()` action and JWT strategy, but cookie clearing, redirect, and subsequent protected-route denial have not been exercised in a running Next.js/browser runtime. The auth tests explicitly document the Vitest `next/server` limitation. Do not claim end-to-end logout verification.
- Playwright is declared but there is no Phase 1 E2E configuration or test. Responsive CSS/media-query behavior and live Auth.js logout remain browser-runtime gaps.
- Slice 1 and 2 historical safety-net timing is summarized rather than preserved in the current detailed TDD table.
- The modern-web-guidance search reports that its installed skill version is outdated (`2026_05_16-c5e7870` versus `2026_05_16-c5e78707`). This affects guidance freshness, not the application runtime evidence.

**SUGGESTION**:

- Add a Playwright flow for registration, credentials sign-in, sign-out cookie clearing, redirect to `/login`, and rejection of a subsequent `/dashboard` request.
- Add an E2E responsive/a11y smoke for mobile navigation and `prefers-reduced-motion`; add a coverage provider if changed-file coverage is a release requirement.
- Use a symlink-capable Windows configuration or Linux CI to generate and validate the standalone artifact.

### Future Phase 2 Work (Not Verified Here)

- Item types, dynamic fields, configurable statuses, and the next domain models.
- Invitations and detailed project role/permission administration.
- Email verification, SMTP, OAuth, password reset, and production rate-limit implementation.
- Browser E2E coverage and production security-header rollout.

### Verdict

**PASS WITH WARNINGS** — Phase 1 is complete at the requirements and runtime-test level: 14/14 tasks, 14/14 requirements, and 20/20 scenarios have fresh passing covering tests; the serial suite is 296/296. The verdict is not a claim that browser-runtime logout or standalone packaging passed: both remain explicitly unverified/blocked by the documented runtime and Windows symlink limitations.
