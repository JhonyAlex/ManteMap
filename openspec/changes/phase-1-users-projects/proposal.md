# Proposal: Phase 1 — Users and Projects

## Intent

Enable secure self-service access and project ownership so ManteMap can move from its landing page to authenticated project workspaces.

## Scope

### In Scope
- Public email/password registration and login/logout; the first registered user becomes the active system `ADMIN` atomically.
- Basic global roles, project CRUD (create, list, read, update, archive), and member-scoped project access.
- Creator becomes `Project.ownerId` and `ProjectMember(OWNER)` in one transaction.
- Protected responsive application shell with sidebar and breadcrumbs.

### Out of Scope
- Email verification, SMTP, OAuth, invitations, password reset, and a detailed role-permission matrix.
- New domain models, destructive project deletion, and unaudited production schema baselining.

## Capabilities

### New Capabilities
- `user-authentication`: Credentials registration, authentication, sessions, and bootstrap administration.
- `project-management`: Transactional project lifecycle and creator ownership.
- `project-access-control`: Authenticated and membership-scoped server access.
- `application-shell`: Protected navigation and responsive project workspace layout.

### Modified Capabilities
None; `openspec/specs/` has no existing capability specs.

## Approach

Use NextAuth.js v5 Credentials with explicit JWT sessions and `bcryptjs`. Zod validates boundaries; services own password, bootstrap, membership, and authorization rules; repositories own Prisma queries/transactions. Keep JWT identity/role-only. Use a serializable, retry-safe registration transaction so exactly one first user gets `ADMIN`; atomically create the project owner plus OWNER membership. No schema change is expected. Production was created via `prisma db push`: never assume migration history or run baseline/destructive migration commands.

## Delivery Plan

| Slice | Independently verifiable outcome | Forecast | Review burden |
|---|---|---:|---|
| 1. Auth foundation | Register/login/logout, protected routes, one ADMIN bootstrap | 550–700 | Medium |
| 2. Project lifecycle | Authenticated creation, CRUD/archive, atomic OWNER membership | 500–650 | Medium |
| 3. Access control | Server membership checks and role-boundary tests | 350–500 | Low–Medium |
| 4. Application shell | Responsive dashboard, navigation, project context | 450–650 | Medium |

Each slice is a separate <800-line review. Strict TDD: tests first for services/repositories, bootstrap concurrency, and transaction failures; run `pnpm test`, lint, typecheck, and build.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/lib/auth.ts`, `middleware.ts` | New | Credentials/JWT auth and route protection |
| `apps/web/src/lib/{services,repositories}/` | New | User/project rules and Prisma access |
| `apps/web/src/app/(auth|dashboard)/`, `app/api/` | New/Modified | Forms, shell, endpoints |
| `packages/validation/` | Modified | Reuse/extend request schemas only as needed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| NextAuth v5 beta API changes | Med | Isolate configuration and pin tested version |
| Concurrent first registration | Low | Serializable transaction, retry, unique-email handling |
| Production schema drift from `db push` | Med | Back up and inspect before any schema operation |
| JWT or permission overreach | Low | Minimal claims; defer detailed matrix |

## Rollback Plan

Revert the affected deployment to the prior standalone build. No schema migration is planned; preserve created data and use a reviewed operational cleanup procedure if required.

## Dependencies

- Existing Prisma Phase 0 schema; add `bcryptjs`; deployment-provided `AUTH_SECRET` and `APP_URL`.

## Success Criteria

- [ ] Registration atomically creates one active initial ADMIN; later users receive the default role without email verification.
- [ ] Authenticated users can create projects and become their atomic OWNER member; non-members cannot access scoped project endpoints.
- [ ] Four independently testable slices pass required quality checks within the review budget.
