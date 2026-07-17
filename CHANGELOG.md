# CHANGELOG — ManteMap

Registro de cambios funcionales relevantes.

---

## [Unreleased] — 2026-07-17

### Added

- Phase 2 Slice 1 Item Type model, shared validation, repository/service layers, and project-scoped API routes.
- Owner-only mutations, member-only reads, duplicate-slug conflicts, safe error envelopes, and non-destructive archive behavior.
- Focused service and route tests for authentication, membership, owner policy, ADMIN behavior, scoping, validation, and archive semantics.
- ADR-005 and OpenSpec artifacts documenting the production Prisma baseline prerequisite.

### Deferred

- Dynamic fields and configurable statuses remain future Phase 2 slices.

### Verification Notes

- No database-mutating Prisma command was run.
- Windows standalone build verification has a known symlink creation `EPERM` limitation; see `docs/progress/CURRENT_STATUS.md`.

## [0.1.0] — 2026-07-15

### Added

- Inicialización del proyecto (Fase 0).
- Monorepositorio con pnpm workspaces y Turborepo.
- Aplicación Next.js 15 con App Router.
- Schema Prisma base (User, Account, Session, Project, VerificationToken).
- Docker Compose para desarrollo (PostgreSQL 16).
- Configuración TypeScript, ESLint, Prettier.
- Documentación: AGENTS.md, README.md, ROADMAP.md, CHANGELOG.md.
- ADR-001 (Arquitectura), ADR-002 (Campos dinámicos), ADR-003 (Almacenamiento), ADR-004 (Planos).
- Estado actual del proyecto en docs/progress/CURRENT_STATUS.md.

---

> Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
> Versionado semántico: [SemVer](https://semver.org/lang/es/).
