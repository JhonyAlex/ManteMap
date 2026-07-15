# ManteMap

Plataforma de gestión documental, activos, vencimientos y planos interactivos.

---

## Descripción

ManteMap permite centralizar la gestión de proyectos, inventarios, documentación técnica, fechas de vencimiento, mantenimientos, ubicaciones y planos interactivos en una sola aplicación web moderna, modular y autoalojable.

### Características principales

- **Proyectos**: Organización por proyectos con acceso controlado por roles.
- **Ítems configurables**: Tipos de activos con campos dinámicos definidos por el usuario.
- **Documentación**: Adjuntar documentos, URLs, fotografías con versiones y vencimientos.
- **Eventos y calendario**: Revisiones, calibraciones, mantenimientos con recurrencia.
- **Ubicaciones**: Jerarquía de centros, edificios, plantas, áreas y subáreas.
- **Planos interactivos**: Visualización y posicionamiento de activos sobre planos.
- **Alertas**: Notificaciones por vencimientos, mantenimientos pendientes, etc.
- **Historial**: Auditoría completa de cambios.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui |
| Estado remoto | TanStack Query 5 |
| Formularios | React Hook Form + Zod |
| Base de datos | PostgreSQL 16 |
| ORM | Prisma 6 |
| Autenticación | NextAuth.js v5 |
| Monorepo | pnpm workspaces + Turborepo |
| Contenedores | Docker + Docker Compose |

---

## Requisitos previos

- **Node.js** 20 LTS o superior
- **pnpm** 9.x o superior
- **Docker** y **Docker Compose** (para PostgreSQL y desarrollo completo)
- **Git**

---

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd ManteMap
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores apropiados (ver `.env.example` para documentación de cada variable).

### 4. Levantar la base de datos

```bash
docker compose -f docker-compose.dev.yml up -d
```

Esto levanta:
- PostgreSQL 16 en el puerto 5432

### 5. Ejecutar migraciones

```bash
pnpm db:migrate
```

### 6. Cargar datos de demostración (opcional)

```bash
pnpm db:seed
```

### 7. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## Estructura del proyecto

```text
ManteMap/
├── apps/
│   └── web/              # Aplicación Next.js full-stack
├── packages/
│   ├── database/         # Prisma schema, migraciones, cliente
│   ├── ui/               # Componentes UI compartidos
│   ├── validation/       # Esquemas Zod
│   ├── config/           # Configuración compartida
│   └── shared/           # Utilidades y tipos comunes
├── docs/                 # Documentación
├── scripts/              # Scripts de automatización
├── docker/               # Archivos Docker adicionales
├── AGENTS.md             # Guía para IAs
├── ROADMAP.md            # Hoja de ruta
├── CHANGELOG.md          # Registro de cambios
└── docker-compose.yml    # Composición de servicios
```

---

## Comandos disponibles

### Desarrollo

```bash
pnpm dev              # Iniciar servidor de desarrollo
pnpm build            # Build de producción
pnpm start            # Iniciar servidor de producción
```

### Calidad de código

```bash
pnpm lint             # ESLint
pnpm lint:fix         # ESLint con auto-fix
pnpm format           # Prettier
pnpm format:check     # Verificar formato
pnpm typecheck        # TypeScript type checking
```

### Base de datos

```bash
pnpm db:migrate       # Ejecutar migraciones pendientes
pnpm db:push          # Push del schema (desarrollo)
pnpm db:studio        # Abrir Prisma Studio
pnpm db:seed          # Cargar datos de demostración
pnpm db:generate      # Regenerar cliente Prisma
```

### Testing

```bash
pnpm test             # Ejecutar tests
pnpm test:watch       # Tests en modo watch
pnpm test:e2e         # Tests end-to-end
```

---

## Despliegue

Ver `docs/deployment/` para guías detalladas de despliegue.

### Docker (producción)

```bash
docker compose up -d
```

### Dokploy

Compatible con Dokploy para despliegue autoalojado. Ver `docs/deployment/dokploy.md`.

---

## Documentación

- [Arquitectura](docs/architecture/) — Decisiones y diseño del sistema
- [Decisiones técnicas](docs/decisions/) — ADRs (Architecture Decision Records)
- [Funcional](docs/functional/) — Especificaciones funcionales
- [Despliegue](docs/deployment/) — Guías de despliegue
- [Testing](docs/testing/) — Estrategia de pruebas
- [Progreso](docs/progress/) — Estado actual del desarrollo
- [ROADMAP.md](ROADMAP.md) — Hoja de ruta por fases
- [AGENTS.md](AGENTS.md) — Guía para agentes de IA

---

## Licencia

(privado — pendiente de definir)

---

> **Nota para IAs**: Lee `AGENTS.md` antes de modificar cualquier código en este repositorio.
