# Estado actual — ManteMap

> Última actualización: 2026-07-17

---

## Fase activa

**Fase 2 — Tipos, campos y estados** 🔄 Activa

Fase 0 y Fase 1 están completadas. El slice actual es **Item Type CRUD**: modelo Prisma, validación, repository/service, rutas protegidas y pruebas enfocadas.

---

## Despliegue en producción

- **URL**: https://mante.saharapro.team/
- **Plataforma**: Dokploy + Docker CLI
- **Base de datos**: PostgreSQL (tablas creadas con `prisma db push`)
- **Estado**: Landing page funcionando
- **Schema rollout**: A schema-only production dump was inspected and reconciled with the checked-in Prisma schema. Backup verification, migration-history verification, baseline marking, and reviewed ItemType migration application remain pending.

### Notas del despliegue

1. `next.config.ts` tiene `output: 'standalone'` para el build Docker.
2. `apps/web/public` existe con `.gitkeep` (Dockerfile hace COPY de ese directorio).
3. Docker restart policy: `any` (Next.js puede terminar limpiamente; `on-failure` no lo reiniciaría en Swarm).
4. Healthcheck usa `127.0.0.1` en vez de `localhost` (compatibilidad IPv4 con Alpine).
5. Se usó `prisma db push` para crear tablas. The inspected schema-only dump confirms the pre-ItemType production shape. ADR-005 still requires backup, migration-history verification, safe baseline marking, and reviewed ItemType migration application.
6. Dokploy DB tiene registros (`application`, `postgres`, `domain`), pero los servicios Docker se crearon directamente via CLI (API de Dokploy sin permisos suficientes).

---

## Qué funciona realmente

- ✅ Monorepositorio con pnpm workspaces + Turborepo.
- ✅ Aplicación Next.js 15 con App Router configurada en `apps/web`.
- ✅ Schema Prisma base definido (User, Account, Session, Project, ProjectMember).
- ✅ Phase 1 authentication, projects, access control, and protected shell.
- ✅ Phase 2 Slice 1 Item Type validation, repository/service, API routes, and focused tests are implemented in the worktree.
- ✅ Docker Compose para PostgreSQL 16 con healthcheck.
- ✅ Configuración TypeScript, ESLint, Prettier funcionando.
- ✅ Packages compartidos: database, shared, validation, ui, config.
- ✅ Healthcheck endpoint en `/api/health`.
- ✅ Desplegado en https://mante.saharapro.team/

## Qué está simulado

- Nada. No se simula la aplicación de la migración: production rollout remains blocked by ADR-005.

## Qué está incompleto

- Operational adoption of the prepared versioned Prisma migrations (the repository now contains the baseline and ItemType migration; see ADR-005).
- Seed de demostración.
- Dynamic fields and configurable statuses (deferred Phase 2 slices).

## Qué errores existen

- Known verification limitation: Windows production build reaches compilation, type validation, and static generation but may fail at standalone symlink creation with `EPERM`.
- Production schema has not been mutated by this slice; deploying the new routes before the reviewed baseline/migration is a known operational risk.

---

## Cómo levantar el entorno local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 4. Ejecutar migraciones only after the approved baseline procedure
pnpm db:migrate

# 5. Iniciar desarrollo
pnpm dev
```

## Qué comando ejecutar para validar

```bash
pnpm lint              # Pending fresh Phase 2 verification
pnpm typecheck         # Pending fresh Phase 2 verification
pnpm build             # Known Windows standalone symlink EPERM risk
pnpm test              # Focused Phase 2 tests plus existing suite
```

---

## Última migración

Prepared, not applied: `20260717000000_baseline_production_schema` and `20260717000100_add_item_types`. Production was initially created with `prisma db push`; see `docs/decisions/ADR-005-prisma-migration-baseline.md`.

## Último commit estable

`ef299b0` — Refactor code structure for improved readability and maintainability; remove redundant sections and optimize performance.

## Próxima tarea concreta

Continuar con **Fase 2 Slice 1** verification and the operational Prisma baseline prerequisite:

1. Verify a restorable production backup and `_prisma_migrations` history.
2. Mark the verified baseline migration as applied without executing its create-DDL.
3. Apply the reviewed Item Type migration in an approved window.
4. Plan the next bounded slice for dynamic fields; configurable statuses remain separate.
