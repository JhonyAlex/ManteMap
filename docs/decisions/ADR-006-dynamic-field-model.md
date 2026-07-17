# ADR-006: Modelo de datos de campos dinámicos

## Estado

Aceptada

## Fecha

2026-07-17

## Contexto

La Fase 2 Slice 2 de ManteMap requiere definiciones de campos configurables por tipo de ítem (ItemType). El ADR-002 ya estableció el modelo híbrido (definiciones normalizadas + valores en JSONB), pero no especificó el modelo concreto para almacenar las definiciones. Se necesita decidir cómo persistir los metadatos de cada campo: nombre, tipo (18 tipos), orden, opciones para SELECT/MULTI_SELECT, reglas de validación, y flags como `required`, `showInList` y `showInSearch`.

El paquete `packages/shared/src/types/domain.ts` ya define las interfaces `DynamicFieldDefinition`, `DynamicFieldType`, `FieldOption` y `FieldValidation` desde la Fase 0.

## Opciones consideradas

### Opción A: Tabla relacional `DynamicField` con FK a `ItemType`

Crear un modelo Prisma `DynamicField` con `itemTypeId`, `key`, `type` (enum de 18 valores), `order`, `required`, `options` (JSON), `validation` (JSON), y columnas de metadatos. Relación uno-a-muchos desde `ItemType` con `onDelete: Cascade`.

- **Pros**: Consultable por tipo de campo, itemTypeId o key. Tipos generados por Prisma. Migraciones correctas con `prisma migrate dev`. `include: { dynamicFields: true }` en lecturas de ItemType. `@@unique([itemTypeId, key])` para unicidad. `@@index([itemTypeId, order])` para recuperación ordenada. Coincide con el patrón de arquitectura existente.
- **Contras**: Dos columnas JSON (`options`, `validation`) que requieren validación en runtime con Zod. Requiere un join para ItemType + campos (Prisma `include` lo maneja transparentemente).

### Opción B: Columna JSONB en `ItemType`

Agregar `fields Json[]` directamente al modelo `ItemType`. Todas las definiciones en un solo array.

- **Pros**: Una sola tabla, sin joins. Migración más simple.
- **Contras**: No permite consultar campos individuales. Tipo `Json` de Prisma con type safety limitada. Mutaciones de array complejas (leer, modificar, escribir array completo). Viola el patrón relacional del proyecto. Sin FK constraint sobre estructura de `options`. Difícil de evolucionar para la Fase 3 (Items referenciarán definiciones de campos).

### Opción C: Modelo polimórfico tabla-por-tipo

Separar cada tipo de campo en su propio modelo Prisma (`ShortTextField`, `NumberField`, `SelectField`, etc.) con una tabla base `DynamicField`.

- **Pros**: Type-safe a nivel de columna por tipo de campo.
- **Contras**: 18 tablas separadas — sobre-ingeniería para el problema. Consultas union complejas. Sin soporte de Prisma para herencia de tablas. Cada nuevo tipo de campo requiere un nuevo modelo + migración.

## Decisión

**Opción A: Tabla relacional `DynamicField` con FK a `ItemType`**

## Motivo

1. **Extensión natural de la arquitectura**: El código ya usa modelos relacionales con FKs, `include` para eager loading, y columnas JSON para datos semi-estructurados (`Project.config` ya usa `Json?`).
2. **Consultabilidad**: Se puede filtrar por tipo de campo, itemTypeId, o key sin deserializar arrays completos.
3. **Integridad referencial**: `onDelete: Cascade` desde ItemType garantiza que eliminar un tipo de ítem elimina sus campos. `@@unique([itemTypeId, key])` evita claves duplicadas dentro de un mismo tipo.
4. **Rendimiento con orden**: `@@index([itemTypeId, order])` permite recuperar campos ordenados eficientemente.
5. **Evolución futura**: La Fase 3 necesitará referenciar definiciones de campos desde valores de ítems. Una tabla normalizada lo permite con FKs; un JSONB en ItemType lo complicaría.
6. **Coincidencia con ADR-002**: El ADR-002 ya decidió «definiciones normalizadas + valores en JSONB». Esta decisión implementa la parte de definiciones normalizadas.

### Modelo Prisma resultante

```prisma
model DynamicField {
  id           String           @id @default(cuid())
  itemTypeId   String
  name         String
  key          String
  type         DynamicFieldType
  description  String?
  required     Boolean          @default(false)
  defaultValue Json?
  order        Int              @default(0)
  visible      Boolean          @default(true)
  active       Boolean          @default(true)
  options      Json?
  unit         String?
  validation   Json?
  showInList   Boolean          @default(false)
  showInSearch Boolean          @default(false)
  helpText     String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  itemType ItemType @relation(fields: [itemTypeId], references: [id], onDelete: Cascade)

  @@unique([itemTypeId, key])
  @@index([itemTypeId, order])
  @@map("dynamic_fields")
}

enum DynamicFieldType {
  SHORT_TEXT    LONG_TEXT     NUMBER        DECIMAL
  CURRENCY      BOOLEAN       DATE          DATETIME
  SELECT        MULTI_SELECT  URL           EMAIL
  PHONE         FILE          IMAGE         ITEM_RELATION
  LOCATION_RELATION           USER_RELATION
}
```

## Consecuencias

- **Validación runtime de JSON obligatoria**: Las columnas `options` y `validation` son `Json?` — Prisma no valida su estructura interna. El servicio debe validar con Zod al leer y escribir. Los schemas `createDynamicFieldSchema` y `updateDynamicFieldSchema` en `packages/validation/src/dynamic-field.ts` cubren esta responsabilidad.
- **Prevención de N+1**: En listados de ItemType no se incluyen dynamicFields (solo en GET individual). El repositorio `findItemTypeById` acepta un parámetro `include` opcional para que el llamante decida qué cargar.
- **Estrategia de reordenamiento**: Columna `order` de tipo `Int`. El endpoint `PUT .../fields/reorder` recibe `{ fieldIds: string[] }` y reasigna valores de orden secuencialmente según la posición en el array.
- **Soft-delete**: El campo `active` permite desactivar campos sin perder datos. Las lecturas filtran `active: true` por defecto. Los endpoints DELETE marcan `active = false`.
- **Sincronización de enum**: El `DynamicFieldType` del schema Prisma debe mantenerse sincronizado con el tipo `DynamicFieldType` en `packages/shared/src/types/domain.ts`. Una divergencia rompería los tipos generados.
- **Deferido a slices futuros**: La generación de formularios desde definiciones (Slice 4), los estados configurables (Slice 3), y el almacenamiento de valores de ítems (Fase 3) quedan fuera del alcance de esta decisión.
