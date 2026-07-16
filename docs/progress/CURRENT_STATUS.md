# Estado actual — ManteMap

> Última actualización: 2026-07-15

---

## Fase activa

**Fase 0 — Descubrimiento y arquitectura** ✅ Completada y desplegada

---

## Despliegue en producción

- **URL**: https://mante.saharapro.team/
- **Plataforma**: Dokploy + Docker CLI
- **Base de datos**: PostgreSQL (tablas creadas con `prisma db push`)
- **Estado**: Landing page funcionando

### Notas del despliegue

1. `next.config.ts` tiene `output: 'standalone'` para el build Docker.
2. `apps/web/public` existe con `.gitkeep` (Dockerfile hace COPY de ese directorio).
3. Docker restart policy: `any` (Next.js puede terminar limpiamente; `on-failure` no lo reiniciaría en Swarm).
4. Healthcheck usa `127.0.0.1` en vez de `localhost` (compatibilidad IPv4 con Alpine).
5. Se usó `prisma db push` para crear tablas. Las migraciones versionadas se crearán en fases siguientes.
6. Dokploy DB tiene registros (`application`, `postgres`, `domain`), pero los servicios Docker se crearon directamente via CLI (API de Dokploy sin permisos suficientes).

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
- ✅ **Desplegado en https://mante.saharapro.team/**

---

## Qué está simulado

- Nada. Todas las validaciones pasan y la app está en producción.

---

## Qué está incompleto

- Migraciones versionadas de Prisma (actualmente `db push`).
- Seed de demostración.
- Autenticación (Fase 1).
- Tests (pendientes de funcionalidad).

---

## Qué errores existen

- Ninguno bloqueante.

---

## Cómo levantar el entorno local

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
pnpm lint              # ✅ Pasa sin errores
pnpm typecheck         # ✅ Pasa sin errores
pnpm build             # ✅ Pasa (standalone output)
pnpm test              # ⬜ Pendiente (no hay tests aún)
```

---

## Última migración

Tablas creadas con `prisma db push` en producción. Migraciones versionadas pendientes.

---

## Último commit estable

`c15b08d` — fix: resolve Tailwind v4 compatibility, fix Prisma schema, update docs

---

## Próxima tarea concreta

Continuar con **Fase 1: Usuarios y proyectos**:
1. Autenticación (login/logout/registro)
2. Roles básicos (Admin, Gestor, Técnico, Consulta)
3. CRUD de proyectos
4. Acceso por proyecto
5. Layout principal (sidebar, breadcrumbs)
