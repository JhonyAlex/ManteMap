# Design: Phase 1 — Users and Projects

## Technical Approach

Deliver four review slices: auth foundation, project lifecycle, access control, and application shell. Route handlers validate with shared Zod schemas, services enforce business rules, repositories own Prisma operations, and Server Components call server auth/services; only forms, navigation state, and `SessionProvider` are client components. Each slice remains independently testable and below 800 changed lines.

## Architecture Decisions

| Concern | Decision | Rejected / tradeoff |
|---|---|---|
| Sessions | NextAuth v5 Credentials with JWT containing only `sub`, email, name, and global role | Database sessions add a request query; membership claims become stale/large |
| Auth isolation | `auth.config.ts` is edge-safe; `auth.ts` owns Credentials, Prisma-backed service calls, and callbacks | Importing Prisma/bcrypt from middleware breaks runtime isolation |
| First user | Hash before a Serializable transaction; count users and create `ADMIN` (the persisted initial system-owner representation) when zero, otherwise `TECHNICIAN`; retry `P2034` three times with bounded jitter | Seed/env bootstrap conflicts with public registration |
| Project ownership | One Serializable repository transaction creates `Project` plus nested `ProjectMember(OWNER)`; retry only `P2034` | Separate writes can leave an owner without membership |
| Authorization | Any authenticated user creates; members read; OWNER updates/archives; non-members receive 404, insufficient members 403; ADMIN has no implicit project bypass | A broad role matrix is deferred |
| Schema | No Prisma schema or production schema operation | Baselining/migrating a `db push` database is unsafe in this change |

## Data Flow

```text
Register route → Zod → UserService → hash → UserRepository → Serializable tx/retry → User
Credentials → AuthService → UserRepository → constant-work bcrypt check → JWT → Session
Project route → auth() → Zod → ProjectService → membership policy → ProjectRepository → PostgreSQL
```

Middleware protects UI navigation only; every API route and service performs authoritative session/membership checks.

## File Changes

| File | Action | Responsibility |
|---|---|---|
| `apps/web/package.json`, `pnpm-lock.yaml` | Modify | Add pinned `bcryptjs` |
| `packages/validation/src/user.ts`, `project.ts` | Modify | Normalize email/code and reject passwords over bcrypt's 72-byte limit |
| `apps/web/src/auth.config.ts`, `auth.ts`, `middleware.ts` | Create | Edge policy, Node-only Credentials/JWT configuration, UI route gate |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `api/auth/register/route.ts` | Create | Auth handlers and registration |
| `apps/web/src/lib/repositories/{transaction,user,project}-repository.ts` | Create | Injectable Prisma access and bounded serialization retry |
| `apps/web/src/lib/services/{auth,user,project,project-access}-service.ts` | Create | Password, bootstrap, lifecycle, and authorization rules |
| `apps/web/src/lib/http/api-error.ts`, `lib/auth/session.ts`, `types/next-auth.d.ts` | Create | Safe API errors, auth guards, typed claims |
| `apps/web/src/app/api/projects/route.ts`, `api/projects/[projectId]/route.ts`, `api/projects/[projectId]/archive/route.ts` | Create | List/create/read/update/archive contracts |
| `apps/web/src/app/(auth)/**`, `app/(dashboard)/**`, `components/{providers,auth,layout,projects}/**`, `app/layout.tsx` | Create/Modify | Forms, protected shell, sidebar, breadcrumbs, project UI, thin session provider |
| `apps/web/vitest.config.ts`, co-located `*.test.ts(x)` | Create | Node aliases, dependency seams, slice tests |

## Interfaces / Contracts

Routes return `ApiResponse<T>`: success uses `{ data, message? }`; failure uses `{ error: code, message }`. `POST /api/auth/register`; `GET|POST /api/projects`; `GET|PATCH /api/projects/:id`; `POST /api/projects/:id/archive`. Services accept validated DTOs plus actor ID and injected repository/hasher seams; repositories accept injected `PrismaClient`/transaction clients. Only `P2034` retries; `P2002` becomes 409, exhausted retries become safe 503, and unknown database details remain server-only.

## Security and Testing Strategy

Use bcrypt cost 12, lowercase trimmed emails, generic login failures, a dummy-hash comparison for unknown users, ACTIVE-status checks, secure Auth.js cookies/CSRF defaults, no password/JWT logging, and deployment rate limits for public auth endpoints.

| Slice | RED-first verification |
|---|---|
| 1 Auth | Unit hash/status/error tests; real disposable-PostgreSQL concurrent registrations prove exactly one ADMIN and rollback/retry behavior |
| 2 Projects | Repository/service tests prove atomic OWNER membership, unique-code 409, archive-not-delete |
| 3 Access | Route/service tests cover 401, hidden non-member 404, OWNER mutation, and no ADMIN bypass |
| 4 Shell | Component/navigation tests plus lint, typecheck, and build; Playwright remains deferred until its missing dependency/config exists |

## Threat Matrix

Routing changes are covered above; the reference matrix contains process/VCS boundaries only.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no executable classification |
| Git repository selection | N/A — no VCS automation |
| Commit state | N/A — no commit automation |
| Push state | N/A — no push automation |
| PR commands | N/A — no PR automation |

## Migration / Rollout

No migration is required. Before deployment, back up and inspect production schema compatibility, configure `AUTH_SECRET` and `APP_URL`, and generate Prisma Client during build only. Do not run `migrate dev`, `migrate deploy`, baseline/reset, or production `db push`. Roll back to the previous image without deleting newly created compatible rows; investigate data cleanup separately under review.

## Open Questions

None.
