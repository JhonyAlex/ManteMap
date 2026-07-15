# Estado actual — ManteMap

> Última actualización: 2026-07-15

---

## Fase activa

**Fase 0 — Descubrimiento y arquitectura**

---

## Qué funciona realmente

- Estructura de monorepositorio creada (pnpm workspaces).
- Aplicación Next.js 15 configurada en `apps/web`.
- Schema Prisma base definido con modelos iniciales.
- Docker Compose para PostgreSQL 16.
- Documentación completa del proyecto.

---

## Qué está simulado

- Nada. Todavía no hay funcionalidad implementada.

---

## Qué está incompleto

- Verificación de que el proyecto levanta (pendiente de `pnpm install` y Docker).
- Tests básicos.
- Seed de demostración.

---

## Qué errores existen

- Ninguno conocido todavía (proyecto sin ejecutar).

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
pnpm lint

# Typecheck
pnpm typecheck

# Tests
pnpm test

# Build
pnpm build
```

---

## Última migración

`20260715000000_init` — Schema inicial con User, Account, Session, Project, VerificationToken.

---

## Último commit estable

(Proyecto nuevo — primer commit pendiente)

---

## Próxima tarea concreta

1. Ejecutar `pnpm install` y verificar que no hay errores de dependencias.
2. Ejecutar `docker compose -f docker-compose.dev.yml up -d` y verificar PostgreSQL.
3. Ejecutar `pnpm db:migrate` y verificar migración.
4. Ejecutar `pnpm dev` y verificar que Next.js levanta en localhost:3000.
5. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm build`.
6. Si todo pasa → Fase 0 cerrada. Continuar con Fase 1 (Usuarios y proyectos).
