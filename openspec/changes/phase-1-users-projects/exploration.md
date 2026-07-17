# Exploration: Phase 1 — Users and Projects

## Current State

### What exists today

**Prisma schema** is well-defined with all Phase 1 models already present:
- `User` — has `role` (UserRole enum: ADMIN, PROJECT_MANAGER, TECHNICIAN, VIEWER), `status` (UserStatus), `passwordHash`, email, image
- `Account` — NextAuth.js OAuth accounts table
- `Session` — NextAuth.js session table
- `VerificationToken` — NextAuth.js email verification
- `Project` — has `code`, `name`, `description`, `status` (ACTIVE/ARCHIVED/DELETED), `ownerId`, `config` JSON
- `ProjectMember` — join table with `ProjectRole` enum (OWNER, MANAGER, MEMBER, VIEWER)
- All relations are defined: User→Account, User→Session, User→ProjectMember, User→ownedProjects, Project→owner, Project→members

**Zod validation schemas** already exist in `packages/validation`:
- `registerUserSchema` — name, email, password with strength rules
- `loginUserSchema` — email, password
- `createProjectSchema` — code (uppercase alphanumeric), name, description
- `updateProjectSchema` — partial of create

**Error types** in `packages/shared/src/errors.ts`:
- `AuthenticationError` (401), `AuthorizationError` (403), `NotFoundError` (404), `ValidationError` (400), `ConflictError` (409)
- `handlePrismaError()` — maps Prisma error codes to AppError subclasses

**What does NOT exist yet:**
- No NextAuth.js configuration file (`auth.ts` or `[...nextauth]/route.ts`)
- No auth middleware or session provider
- No service layer (`apps/web/src/lib/services/` is empty)
- No repository layer (`apps/web/src/lib/repositories/` does not exist)
- No API routes beyond `/api/health`
- No app pages beyond `/` (landing page)
- No layout components, sidebar, or navigation
- No test files whatsoever
- No React hooks
- `apps/web/src/components/` is empty
- `apps/web/src/types/` is empty

**Infrastructure:**
- Next.js 15 App Router with `output: 'standalone'` (Docker-ready)
- `next-auth@5.0.0-beta.25` is in dependencies
- `@tanstack/react-query@5` is in dependencies
- PostgreSQL 16 via Docker Compose
- Production deployed at https://mante.saharapro.team/ via Dokploy
- Database tables created with `prisma db push` (no versioned migrations yet)
- `AUTH_SECRET` and `APP_URL` are in `.env.example` but not configured
- `strict_tdd: true` in openspec config; Vitest is configured but has 0 test files

### Deployment constraints

- Production DB was created with `prisma db push` — adding new tables or columns requires a migration that is compatible with existing data
- The `User` table may or may not have data in production (unknown)
- `standalone` output mode is required for Docker deployment
- No `.env` with real `AUTH_SECRET` exists in the repo (correct — secrets are in deployment environment)

## Affected Areas

| Path | Why affected |
|------|-------------|
| `packages/database/prisma/schema.prisma` | Already complete for Phase 1 — no schema changes needed |
| `apps/web/src/app/layout.tsx` | Must wrap with SessionProvider, add auth context |
| `apps/web/src/app/page.tsx` | Must redirect to login or show authenticated content |
| `apps/web/src/lib/services/` | Must create user-service.ts, project-service.ts |
| `apps/web/src/lib/repositories/` | Must create user-repository.ts, project-repository.ts |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts` | NextAuth.js route handler |
| `apps/web/src/app/(auth)/` | Login/register pages (route group) |
| `apps/web/src/app/(dashboard)/` | Authenticated layout with sidebar |
| `apps/web/src/components/` | Sidebar, nav, breadcrumbs, forms |
| `apps/web/src/lib/auth.ts` | NextAuth configuration |
| `packages/validation/` | May need update-project-member schema |
| `apps/web/src/middleware.ts` | Route protection |

## Approaches

### Approach A: NextAuth.js v5 Credentials Provider (Recommended)

Use NextAuth.js v5 with the Credentials provider for email/password auth. This matches the existing `passwordHash` field on User and the `loginUserSchema`/`registerUserSchema` already in validation.

**Implementation sequence:**
1. Configure NextAuth.js v5 with Credentials provider + Prisma adapter
2. Create auth API route and session provider
3. Create registration API route with password hashing (bcrypt)
4. Build login/register pages
5. Add middleware for route protection
6. Create service + repository layers for users and projects
7. Build project CRUD API routes and pages
8. Build main layout with sidebar and breadcrumbs
9. Implement project-level access checks in services

- **Pros**: NextAuth v5 is already a dependency; Prisma adapter handles sessions/accounts; Credentials provider is simplest for MVP; schema already has all needed fields
- **Cons**: Credentials provider doesn't support OAuth out of the box (but not needed for Phase 1); beta version of next-auth
- **Effort**: Medium

### Approach B: Custom JWT Auth

Build a custom JWT-based auth system without NextAuth.js.

- **Pros**: Full control, no beta dependency
- **Cons**: More code to write and maintain; ignores the existing NextAuth schema (Account, Session, VerificationToken tables become waste); loses adapter ecosystem
- **Effort**: High

### Approach C: Auth.js with Database Sessions (hybrid)

Use NextAuth.js but with database sessions (Prisma adapter) instead of JWT. The Prisma Session table already exists.

- **Pros**: Sessions stored in DB (auditable); matches existing schema
- **Cons**: Extra DB query per request; more complex than JWT for a single-server deployment
- **Effort**: Medium

## Recommendation

**Approach A: NextAuth.js v5 Credentials Provider with JWT strategy.**

Rationale:
1. The Prisma schema already models User, Account, Session, VerificationToken — designed for NextAuth
2. `next-auth@5.0.0-beta.25` is already installed
3. Zod schemas for login/register already exist
4. Error types (AuthenticationError, AuthorizationError) already exist
5. JWT strategy is simpler for single-server Docker deployment (no DB session lookup per request)
6. The Prisma adapter can be added later for OAuth providers

## Domain Model Analysis

### What the schema already provides

The existing schema is **sufficient for Phase 1**. No new models are needed.

| Model | Purpose | Status |
|-------|---------|--------|
| User | Auth + profile | ✅ Exists |
| Account | OAuth accounts | ✅ Exists (for future OAuth) |
| Session | NextAuth sessions | ✅ Exists |
| VerificationToken | Email verification | ✅ Exists |
| Project | Core entity | ✅ Exists |
| ProjectMember | User↔Project join | ✅ Exists |

### What needs implementation

The **application layer** is missing — all the code that uses these models:
- Auth configuration (NextAuth config, API route)
- Session management (provider, hooks)
- Password hashing (bcrypt)
- Service layer (business logic)
- Repository layer (Prisma queries)
- API routes (REST endpoints)
- UI components (forms, layout, navigation)
- Middleware (route protection)

## Open Product Decisions

1. **Should the first user be auto-promoted to ADMIN?** The schema has `role: UserRole @default(TECHNICIAN)`. There's no seed or bootstrap mechanism. The first registered user should probably be ADMIN, or there should be an env-based admin bootstrap.

2. **Project creation permissions**: Can any authenticated user create a project, or only ADMIN/PROJECT_MANAGER? The ROADMAP says "Roles básicos: Admin, Gestor, Técnico, Consulta" — need to define what each role can do.

3. **Project ownership**: The schema has `ownerId` on Project and a separate `ProjectMember` with role OWNER. Should the creator automatically become the OWNER member?

4. **Registration flow**: Is self-registration open, or invitation-only? The validation schema exists for self-registration, but many enterprise apps use invitation-only.

5. **Email verification**: The VerificationToken table exists. Should Phase 1 require email verification, or is that a later concern?

## Smallest Coherent First Change

**"Auth foundation + protected landing"** — a single change that:
1. Configures NextAuth.js v5 with Credentials provider
2. Creates the auth API route
3. Creates a login page
4. Wraps the app in SessionProvider
5. Adds middleware to protect all routes except `/login` and `/api/health`
6. Creates a register page (first user becomes ADMIN)
7. Adds password hashing to the registration flow
8. Writes tests for auth service (TDD: RED→GREEN)

This is ~400-600 lines of new code, well within the 800-line review budget. It does NOT include project CRUD, layout, or permissions — those are subsequent changes.

## Risks

1. **NextAuth v5 beta**: The `next-auth@5.0.0-beta.25` dependency is pre-release. API surface may change. Mitigation: isolate NextAuth config in `lib/auth.ts` so changes are localized.

2. **`prisma db push` in production**: The database was created without versioned migrations. Adding a migration now will fail because Prisma expects the migration history to match the DB state. Mitigation: use `prisma migrate dev --name init` to baseline, or use `prisma db push` for schema changes and document the debt.

3. **No existing tests**: `strict_tdd: true` is configured but there are 0 test files. The first change must establish the testing pattern. This adds overhead but is architecturally critical.

4. **Password security**: bcrypt is not in current dependencies. Need to add `bcryptjs` (pure JS, works in serverless/standalone).

5. **Session token size**: JWT tokens with role + project memberships could get large. Monitor token size if many project memberships are added.

## Ready for Proposal

**Yes.** The exploration is complete. The orchestrator should:
1. Confirm the open product decisions (or let the user decide)
2. Proceed to `sdd-propose` for `phase-1-users-projects` with the recommended approach
3. The proposal should break Phase  into 3-4 chained changes respecting the 800-line budget:
   - Change 1: Auth foundation (login, register, middleware, session)
   - Change 2: Project CRUD + service/repository layers
   - Change 3: Main layout (sidebar, breadcrumbs, responsive shell)
   - Change 4: Server-side permissions + project access
