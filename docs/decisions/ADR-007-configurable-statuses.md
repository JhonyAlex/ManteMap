# ADR-007: Configurable Statuses per ItemType

## Estado

Aceptada

## Fecha

2026-07-17

## Contexto

La Fase 2 Slice 3 de ManteMap añade estados configurables por tipo de ítem (ItemType). Cada ItemType necesita un conjunto propio de estados con nombre, clave única, color, icono opcional, orden, y un flag `isDefault` para indicar el estado inicial de nuevos ítems. La implementación debe seguir los patrones establecidos por ADR-001 (arquitectura en capas), ADR-005 (acceso por proyecto), y ADR-006 (modelo relacional con FK).

El paquete `packages/shared/src/types/domain.ts` ya define la interfaz `ItemStatus` con campos forward-looking incluyendo `isFinal`, `isBlocking` e `isIncident` para futuras reglas de transición.

## Opciones consideradas

### Opción A: Tabla relacional `Status` con FK a `ItemType`

Crear un modelo Prisma `Status` con `itemTypeId`, `name`, `key`, `color`, `icon`, `order`, `isDefault`, `active` (soft-delete), y columnas deferidas `isFinal`, `isBlocking`, `isIncident`. Relación uno-a-muchos desde `ItemType` con `onDelete: Cascade`.

- **Pros**: Consultable por ItemType, clave única por tipo. Tipos generados por Prisma. Migraciones correctas. `@@unique([itemTypeId, key])` para unicidad de clave dentro del tipo. `@@index([itemTypeId, order])` para recuperación ordenada. Coincide con el patrón de DynamicField.
- **Contras**: Requiere un join para ItemType + estados (Prisma `include` lo maneja). La unicidad de `isDefault` (solo uno por ItemType) no está garantizada a nivel de DB sin un partial unique index — se maneja con `$transaction` en la capa de servicio.

### Opción B: Columna JSONB en `ItemType`

Agregar `statuses Json[]` al modelo `ItemType`. Todos los estados en un solo array.

- **Pros**: Una sola tabla, sin joins.
- **Contras**: No consultable por clave, no indexable, validación compleja en runtime, inconsistente con el patrón DynamicField. Rechazada.

### Opción C: Estados compartidos (many-to-many)

Tabla `Status` global + tabla `ItemTypeStatus` de unión. Estados reutilizables entre ItemTypes.

- **Pros**: Estados reutilizables.
- **Contras**: Sobre-ingeniería para el scope actual. Diferentes ItemTypes tienen semánticas de estado diferentes (e.g., "Activo" en Equipos vs "Activo" en Incidentes). Complejidad innecesaria en el MVP.

## Decisión

**Opción A: Tabla relacional `Status` con FK a `ItemType`**.

La decisión sigue el precedente de ADR-006 (DynamicField). Los patrones de repositorio, servicio, rutas API, autorización y testing son idénticos. Esto minimiza la carga cognitiva, reusa el `verifyItemTypeInProject` pattern, y mantiene la consistencia arquitectónica.

### Modelo de datos

```prisma
model Status {
  id          String   @id @default(cuid())
  itemTypeId  String
  name        String
  key         String
  color       String
  icon        String?
  description String?
  order       Int      @default(0)
  isDefault   Boolean  @default(false)
  active      Boolean  @default(true)
  isFinal     Boolean  @default(false)
  isBlocking  Boolean  @default(false)
  isIncident  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  itemType ItemType @relation(fields: [itemTypeId], references: [id], onDelete: Cascade)

  @@unique([itemTypeId, key])
  @@index([itemTypeId, order])
  @@map("statuses")
}
```

### Unicidad de `isDefault`

El flag `isDefault` no tiene un constraint de unicidad a nivel de base de datos (no partial unique index en SQLite o PostgreSQL sin soporte de partial indexes condicionales). En su lugar, la capa de servicio usa `$transaction` para:
1. Desmarcar cualquier default existente (`UPDATE ... SET "isDefault" = false WHERE "itemTypeId" = X AND "isDefault" = true`)
2. Marcar el nuevo default (`UPDATE ... SET "isDefault" = true WHERE id = Y`)

Esto garantiza atomicidad sin requerir un índice parcial.

### Soft-delete

El borrado es lógico (`active = false`). Las consultas de lista filtran `active: true`. Las mutaciones sobre estados desactivados devuelven `404`. Cuando en el futuro se agregue una FK de `Item.statusId → Status.id`, los ítems con estados desactivados mantendrán la referencia.

### Campos deferidos

`isFinal`, `isBlocking`, `isIncident` existen en el schema como columnas Boolean con default `false`, pero NO se exponen en los Zod schemas ni en la API. Están reservados para futuras reglas de transición de estados (Slice N). Incluirlos ahora evita una migración posterior.

### Autorización

Mismo patrón que DynamicField e ItemType:
- **Lecturas**: `requireProjectMember` — cualquier miembro puede listar y ver estados
- **Mutaciones**: `requireProjectOwner` — solo el dueño del proyecto puede crear, modificar, eliminar, reordenar o cambiar el default
- No hay bypass implícito para ADMIN (ADR-005)

### Integración con ItemType

`getItemType` incluye `statuses` con filtro `active: true` y `orderBy: { order: 'asc' }`, mismo patrón que `dynamicFields`. `listItemTypes` NO incluye estados para prevenir N+1.

### API surface

```
GET    /projects/:projectId/item-types/:itemTypeId/statuses          — list
POST   /projects/:projectId/item-types/:itemTypeId/statuses          — create
GET    /projects/:projectId/item-types/:itemTypeId/statuses/:id      — get
PATCH  /projects/:projectId/item-types/:itemTypeId/statuses/:id      — update
DELETE /projects/:projectId/item-types/:itemTypeId/statuses/:id      — deactivate
PUT    /projects/:projectId/item-types/:itemTypeId/statuses/reorder  — reorder
PUT    /projects/:projectId/item-types/:itemTypeId/statuses/default  — set default
```

## Consecuencias

- **Positivas**: Consistencia arquitectónica total con DynamicField. Misma estructura de archivos, mismos patrones de prueba, mismas reglas de autorización. Cero curva de aprendizaje para desarrolladores que ya conocen el patrón.
- **Negativas**: Dos entidades con FK al mismo padre (ItemType → DynamicField + Status) añaden complejidad al schema. La unicidad de isDefault sin constraint de DB es vulnerable a race conditions en entornos de alta concurrencia — mitigación con `$transaction`.
- **Riesgos**: Si PostgreSQL añade soporte para partial unique indexes (ya disponible en v15+ con `WHERE` clause), se podría reforzar `isDefault` a nivel de DB en una migración futura.
