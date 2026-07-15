# Estado actual — ManteMap

> Última actualización: 2026-07-15

---

## Fase activa

**Fase 0 — Descubrimiento y arquitectura** ✅ Completada

---

## Qué funciona realmente

- ✅ Monorepositorio con pnpm workspaces + Turborepo.
- ✅ Aplicación Next.js 15 con App Router configurada en `apps/web`.
- ✅ Schema Prisma base definido (User, Account, Session, Project, ProjectMember).
- ✅ Docker Compose para PostgreSQL 16 con healthcheck.
- ✅ Configuración TypeScript, ESLint, Prettier funcionando.
- ✅ Packages compartidos: database, shared, validation, ui, config.
- ✅ Healthcheck endpoint en `/api/health`.
- ✅ Página de inicio en `/`.
- ✅ 4 ADRs documentados.
- ✅ Documentación completa (AGENTS.md, README.md, ROADMAP.md, CHANGELOG.md).

---

## Qué está simulado

- Nada. Todas las validaciones pasan.

---

## Qué está incompleto

- Migraciones de Prisma (requiere PostgreSQL corriendo).
- Seed de demostración.
- Autenticación (Fase 1).
- Tests (pendientes de funcionalidad).

---

## Qué errores existen

- Warning de `next.config.js` (MODULE_TYPELESS_PACKAGE_JSON) — informativo, no afecta funcionalidad. Se puede resolver añadiendo `"type": "module"` al package.json o eliminando el archivo `.js` redundante.

---

## Cómo levantar el entorno

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Iniciar desarrollo
pnpm dev
```

---

## Qué comando ejecutar para validar

```bash
# Lint
pnpm lint              # ✅ Pasa sin errores

# Typecheck
pnpm typecheck         # ✅ Pasa sin errores

# Build
pnpm build             # ✅ Pasa (compila, genera páginas estáticas)

# Tests
pnpm test              # ⬜ Pendiente (no hay tests aún)
```

---

## Última migración

`20260715000000_init` — Schema inicial pendiente de ejecutar (requiere PostgreSQL).

---

## Último commit estable

`a7a0fda` — feat: initial project structure - Phase 0 architecture

---

## Próxima tarea concreta

1. Ejecutar `docker compose -f docker-compose.dev.yml up -d` y verificar PostgreSQL.
2. Ejecutar `pnpm db:migrate` y verificar migración.
3. Ejecutar `pnpm dev` y verificar que Next.js levanta en localhost:3000.
4. Si todo pasa → Continuar con **Fase 1: Usuarios y proyectos**.
