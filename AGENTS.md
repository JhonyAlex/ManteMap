# AGENTS.md — ManteMap

> Guía principal para IAs que trabajen en este repositorio.
> Leer ANTES de modificar cualquier código.

---

## 1. Propósito del proyecto

**ManteMap** es una plataforma web de gestión documental, activos, vencimientos y planos interactivos.

### Problema que resuelve

Centralizar la gestión de inventarios, documentación técnica, fechas de vencimiento, mantenimientos y ubicaciones físicas en una sola aplicación. Diseñado para plantas industriales, edificios, instalaciones, almacenes y cualquier organización que necesite rastrear activos con documentación asociada.

### Público objetivo

- Gestores de instalaciones
- Técnicos de mantenimiento
- Responsables de seguridad y cumplimiento
- Administradores de proyectos documentales

### Funciones principales

- Gestión de proyectos con acceso por roles
- Tipos de ítems configurables con campos dinámicos
- Estados configurables por tipo
- Documentación adjunta con versiones y vencimientos
- Eventos y fechas con recurrencia
- Ubicaciones jerárquicas
- Planos interactivos con marcadores
- Calendario de vencimientos y mantenimientos
- Alertas y notificaciones
- Historial y auditoría

### Fuera de alcance (por ahora)

- Facturación y contabilidad
- CRM
- Chat interno
- Aplicación móvil nativa
- Integraciones externas múltiples (solo API preparada)
- BIM / GIS avanzado
- OCR avanzado

---

## 2. Arquitectura

### Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| Lenguaje | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui | 4.x + latest |
| Estado remoto | TanStack Query | 5.x |
| Formularios | React Hook Form + Zod | latest |
| Base de datos | PostgreSQL | 16 |
| ORM | Prisma | 6.x |
| Autenticación | NextAuth.js | v5 |
| Calendario | FullCalendar | latest |
| Planos | React Konva | latest |
| Monorepo | pnpm workspaces + Turborepo | latest |
| Contenedores | Docker + Docker Compose | latest |

### Estructura del repositorio

```text
ManteMap/
├── apps/
│   └── web/              # Next.js full-stack app
│       ├── src/
│       │   ├── app/      # App Router (pages + API routes)
│       │   ├── components/
│       │   ├── lib/
│       │   ├── hooks/
│       │   └── types/
│       └── public/
├── packages/
│   ├── database/         # Prisma schema, migrations, client
│   ├── ui/               # Componentes compartidos
│   ├── validation/       # Esquemas Zod compartidos
│   ├── config/           # Configuración compartida (ESLint, Tailwind presets)
│   └── shared/           # Utilidades y tipos comunes
├── docs/
│   ├── architecture/
│   ├── decisions/        # ADRs
│   ├── functional/
│   ├── deployment/
│   ├── testing/
│   └── progress/
├── scripts/
├── docker/
├── AGENTS.md             # Este archivo
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── package.json          # Root workspace
```

### Relación entre módulos

```text
apps/web → packages/database  (acceso a datos)
apps/web → packages/ui        (componentes)
apps/web → packages/validation (validación de formularios)
apps/web → packages/shared    (utilidades)
packages/database → packages/shared (tipos comunes)
packages/validation → packages/shared (tipos comunes)
```

### Flujo general de datos

```text
Browser → Next.js (Server Components + API Routes)
  → Services (lógica de negocio)
  → Repositories (acceso a datos)
  → Prisma → PostgreSQL

Browser → React (Client Components)
  → TanStack Query → API Routes → Services → DB
```

### Convenciones importantes

- Server Components por defecto. Client Components solo cuando sea necesario (interactividad, hooks de React).
- Separación clara: componentes UI no contienen lógica de negocio.
- API Routes como capa de servicio. No acceder a Prisma directamente desde componentes.
- Validación en cliente (Zod) Y en servidor (Zod schemas compartidos).
- Errores manejados centralmente con tipos definidos.

---

## 3. Reglas de trabajo

1. **Leer este archivo** antes de modificar código.
2. **Revisar Git** antes de comenzar (`git status`, `git log --oneline -5`).
3. **No trabajar directamente** sobre cambios desconocidos.
4. **No borrar código ajeno** sin entenderlo.
5. **No usar comandos destructivos** (`git reset --hard`, `git clean -fd`).
6. **No alterar migraciones aplicadas**. Crear nuevas.
7. **No introducir secretos** en el código.
8. **Mantener tipado estricto**. No usar `any` sin justificación documentada.
9. **Ejecutar validaciones** antes de finalizar (lint, typecheck, tests).
10. **Registrar decisiones técnicas** en `docs/decisions/`.
11. **Mantener actualizada** la documentación de progreso.
12. **No simular funcionalidades** como terminadas si usan datos falsos.

---

## 4. Convenciones de código

### Nombres

- **Archivos**: kebab-case (`user-service.ts`, `item-card.tsx`)
- **Componentes**: PascalCase (`ItemCard`, `ProjectLayout`)
- **Funciones/variables**: camelCase (`getItemById`, `isExpired`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`)
- **Tipos/interfaces**: PascalCase con prefijo `I` opcional, pero mantener consistencia
- **Tablas DB**: snake_case plural (`items`, `item_types`, `dynamic_fields`)

### Organización de archivos

- Un componente por archivo.
- Exportaciones nombradas (no default exports en librerías compartidas).
- Barrel exports (`index.ts`) solo en packages, no en apps.
- Co-locar tests con el archivo que testean (`user-service.test.ts` junto a `user-service.ts`).

### Gestión de errores

- Usar tipos de error definidos en `packages/shared`.
- API Routes devuelven `{ data?, error?, message? }`.
- Errores de DB capturados y transformados antes de llegar al cliente.
- No exponer errores internos de PostgreSQL al frontend.

### Validaciones

- Zod schemas en `packages/validation`.
- Validación en formulario (React Hook Form + Zod resolver).
- Validación en servidor (mismo schema Zod).
- Validación de DB (constraints de Prisma como última línea de defensa).

### Tipos

- Compartidos en `packages/shared/src/types`.
- Prisma genera tipos automáticamente.
- No duplicar tipos entre packages.

### Servicios

- Capa de servicio en `apps/web/src/lib/services/`.
- Cada dominio tiene su servicio: `project-service.ts`, `item-service.ts`.
- Servicios no conocen HTTP. Reciben datos validados, devuelven resultados.

### Repositorios

- Capa de acceso a datos en `apps/web/src/lib/repositories/`.
- Wrappers sobre Prisma para consultas complejas.
- Servicios usan repositorios, no Prisma directamente (para consultas complejas).

### Componentes

- UI primitivos en `packages/ui`.
- Componentes de feature en `apps/web/src/components/`.
- Server Components por defecto.
- `"use client"` solo cuando se necesite interactividad del lado del cliente.

### Formularios

- React Hook Form + Zod resolver.
- Componentes de formulario reutilizables en `packages/ui`.
- Validación en tiempo real para campos críticos.
- Mensajes de error claros y contextualizados.

### Pruebas

- Unitarias: Vitest.
- Integración: Vitest + Prisma mock.
- E2E: Playwright (para flujos críticos del MVP).
- Tests co-located con el código.

### Logs

- Estructurados (JSON en producción).
- Con request ID para trazabilidad.
- No registrar datos sensibles (contraseñas, tokens, documentos).

---

## 5. Límites de tamaño

| Tipo de archivo | Límite recomendado |
|----------------|-------------------|
| Componentes UI | < 200 líneas |
| Servicios | < 250 líneas |
| Rutas/Controladores | < 200 líneas |
| Archivos generales | < 300 líneas |

Si un archivo crece demasiado → dividir por responsabilidad.
No dividir artificialmente archivos pequeños solo para cumplir un número.

---

## 6. Estado actual

### Fase actual

**Fase 0 — Descubrimiento y arquitectura** ✅ Completada

### Funciones terminadas

- Monorepositorio configurado (pnpm workspaces + Turborepo)
- Aplicación Next.js 15 con App Router
- Schema Prisma base (User, Account, Session, Project, ProjectMember)
- Docker Compose para PostgreSQL 16
- Configuración TypeScript, ESLint, Prettier
- Packages compartidos (database, shared, validation, ui, config)
- 4 ADRs documentados
- Documentación completa
- Desplegado en producción (https://mante.saharapro.team/)

### Funcionalidades parcialmente terminadas

- (ninguna aún)

### Funcionalidades pendientes

Ver `ROADMAP.md` para el desglose completo por fases.

### Bloqueos

- (ninguno conocido)

### Deuda técnica conocida

- Tablas creadas con `prisma db push` en vez de migraciones versionadas (se corregirá en fases siguientes).

### Últimas validaciones realizadas

- ✅ Lint: pasa sin errores
- ✅ Typecheck: 6/6 packages pasan
- ✅ Build: compila correctamente (standalone)
- ✅ Despliegue: landing page en producción

### Próximo paso recomendado

Continuar con **Fase 1: Usuarios y proyectos** (autenticación, roles, CRUD proyectos, layout).

---

## 7. Cómo continuar

### Próxima IA debe:

1. Leer este archivo (`AGENTS.md`).
2. Leer `README.md`.
3. Leer `docs/progress/CURRENT_STATUS.md`.
4. Revisar `ROADMAP.md`.
5. Revisar Git (`git log --oneline -10`, `git status`).
6. Identificar qué fase está activa.
7. Continuar con la siguiente tarea pendiente de esa fase.

### Validación del trabajo

```bash
# Instalar dependencias
pnpm install

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Tests
pnpm test

# Build
pnpm build

# Docker (si aplica)
docker compose -f docker-compose.dev.yml up -d
```

### No tocar

- Migraciones ya aplicadas en la base de datos.
- Configuración de Docker en producción sin autorización.
- Decisiones de arquitectura ya documentadas en ADRs sin discusión previa.

---

## 8. Historial resumido

| Fecha | Agente | Trabajo realizado | Estado | Próximo paso |
|-------|--------|-------------------|--------|--------------|
| 2026-07-15 | Claude (mimo-v2.5-pro) | Fase 0: Arquitectura, estructura, documentación, configs | ✅ Completado | Fase 1: Usuarios y proyectos |
| 2026-07-15 | Deploy | Despliegue en producción (Dokploy + Docker) | ✅ Live | https://mante.saharapro.team/ |

---

> **Última actualización**: 2026-07-15
> **Responsable**: Arquitecto IA (Fase 0)
