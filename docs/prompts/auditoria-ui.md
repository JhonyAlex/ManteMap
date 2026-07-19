## Prompt para auditoría general de ManteMap

---

Sos un auditor full-stack revisando la aplicación ManteMap (Next.js 15 + Prisma + NextAuth v5). El proyecto está deployado en https://mante.saharapro.team/ y tiene +2,100 tests pasando. Las APIs del backend están casi todas implementadas y funcionales. El problema es que la UI está incompleta: muchas funcionalidades no tienen páginas, botones, o navegación.

Tu trabajo: hacer una revisión SISTEMÁTICA de toda la app y crear/todos los archivos de UI que falten, arreglando también bugs menores que encuentres.

---

### 1. Estructura del proyecto

- `apps/web/src/app/(dashboard)/` — páginas protegidas (dashboard, proyectos, items, etc.)
- `apps/web/src/app/api/` — API routes (POST/GET/PATCH/DELETE)
- `apps/web/src/components/` — componentes UI
- `apps/web/src/lib/services/` — lógica de negocio
- `packages/validation/src/` — schemas Zod
- `packages/database/prisma/schema.prisma` — modelo de datos

---

### 2. Lo que YA funciona (no tocar la lógica de negocio)

- Auth (login con credentials, NextAuth v5 con JWT)
- API routes completas para: projects, item-types, dynamic-fields, statuses, items, documents, events, locations, floor-plans, alerts, webhooks, inspections, QR, PDF export
- Layout principal: sidebar con lista de proyectos, breadcrumbs (aceptan prop `projectNames`), header
- Dashboard global (`/dashboard`)
- Project hub page (`/projects/[projectId]`)
- Item types CRUD page (`/projects/[projectId]/item-types`)
- Items list + detail + create/edit pages
- Alerts page, Calendar page

---

### 3. Lo que hay que CREAR o ARREGLAR

#### 3.1 Páginas completas faltantes

**Dynamic Fields — `/projects/[projectId]/item-types/[itemTypeId]/fields`**
- La API existe: `GET/POST /api/projects/[projectId]/item-types/[itemTypeId]/fields`
- Schema: `createDynamicFieldSchema` en `packages/validation/src/dynamic-field.ts` (name, slug, type [18 tipos], required, description, placeholder, helpText, unit, options, validation, defaultValue, order, groupName)
- Crear página con: lista de campos existentes + formulario para crear nuevos (select para los 18 tipos de campo, campos condicionales según tipo)

**Statuses — `/projects/[projectId]/item-types/[itemTypeId]/statuses`**
- API: `GET/POST /api/projects/[projectId]/item-types/[itemTypeId]/statuses`, `PATCH /api/.../statuses/[statusId]`
- Schema: `createStatusSchema` (name, color, icon, isDefault, isFinal, isStart)
- Crear página con lista + formulario de creación, reorder visual

**Locations — `/projects/[projectId]/locations`**
- API: `GET/POST /api/projects/[projectId]/locations`
- Schema: `createLocationSchema` (name, description, parentId opcional)
- Jerarquía de ubicaciones con tree view y formulario de creación

**Floor Plans — `/projects/[projectId]/floor-plans`**
- API: `GET/POST /api/projects/[projectId]/floor-plans`
- Lista de planos subidos + upload form

**Documents — integrar en la página de detalle de item**
- La API de documentos está implementada. Verificar si la UI de subida de documentos aparece en `/projects/[projectId]/items/[itemId]`.

#### 3.2 Botones y navegación faltantes

- **Sidebar**: agregar links a: Item Types, Locations, Floor Plans (debajo de cada proyecto activo, igual que Items, Dashboard, Calendar, Alerts)
- **Item Types page**: cada item type debe tener botones "Configure Fields" y "Configure Statuses" (links a las páginas de arriba)
- **Items page** (`/projects/[projectId]/items`): cuando hay item types, mostrar botón "New Item" visible (verificar que existe)
- **Calendar page**: botón "New Event" (verificar)
- **Project hub**: agregar cards para Locations y Floor Plans si faltan
- **Empty states**: TODAS las páginas con lista vacía deben tener un CTA button para crear el primer elemento

#### 3.3 Bugs conocidos

- **Breadcrumbs**: ya se arregló (usa `projectNames` prop), verificar que funcione
- **Project creation**: ya se arregló (lee `data.data.id`), verificar
- **Login flow**: ya funciona con server-side redirect

---

### 4. Reglas de implementación

- **Componentes**: usar Server Components por defecto. Solo `'use client'` cuando haya interactividad (forms, estado).
- **Validación**: usar schemas Zod de `@mantemap/validation`. Validar cliente + servidor.
- **API calls**: usar `fetch()` a las API routes existentes. NO modificar las API routes ni los servicios.
- **Estilos**: Tailwind CSS + shadcn/ui. Consistente con lo existente.
- **Formularios**: seguir el patrón de `NewProjectPage` y `ItemTypesPage` (Zod parse, `useState` para campos, `fetch` a API).
- **Empty states**: `<div>` con borde dashed, texto descriptivo, y botón CTA.
- **Loading states**: mostrar "Loading..." mientras `isLoadingList` es true.
- **Errores**: mostrar en `<div role="alert">` con estilos destructive.

---

### 5. Orden de prioridad

1. **Dynamic Fields page** — es el blocker principal para crear items
2. **Statuses page** — necesario después de fields
3. **Sidebar navigation** — agregar links faltantes
4. **Empty states con CTAs** — en todas las páginas
5. **Locations page**
6. **Floor Plans page**
7. **Documents UI** (verificar si ya existe y solo falta integrar)

---

### 6. Verificación

Después de crear cada página, verificá:
- ¿La API route existe y funciona? (buscá en `apps/web/src/app/api/`)
- ¿El schema Zod existe en `packages/validation/src/`?
- ¿La página compila sin errores de tipo? (`pnpm typecheck --filter @mantemap/web`)
- ¿Los links entre páginas son correctos?

---

### 7. No hacer

- No modificar `packages/database/prisma/schema.prisma`
- No modificar servicios en `apps/web/src/lib/services/`
- No modificar API routes
- No crear nuevas API routes
- No modificar la configuración de auth
- No borrar código existente
