# ADR-008: Dynamic Form Generation from Field Definitions

## Estado

Aceptada

## Fecha

2026-07-17

## Contexto

La Fase 2 Slice 4 de ManteMap añade formularios generados dinámicamente a partir de definiciones de campos (DynamicFieldDefinition). Cada ItemType define un conjunto de campos con tipos, reglas de validación, y opciones. Los formularios de creación/edición de ítems deben generarse automáticamente desde esas definiciones, sin código hardcodeado por tipo. La decisión debe integrarse con los patrones ya establecidos: ADR-001 (arquitectura en capas), ADR-002 (campos dinámicos), ADR-006 (modelo relacional DynamicField), y el uso de Zod + React Hook Form + shadcn/ui ya presente en el proyecto.

El paquete `packages/validation` ya exporta `createFieldValueSchema(fields)` y `packages/shared` define los tipos `DynamicFieldDefinition` y `DynamicFieldType` (18 valores, 13 activos + 5 diferidos).

## Opciones consideradas

### Opción A: Field Registry + Zod Schema Factory + React Hook Form (elegida)

Crear un registro de componentes (`fieldRegistry`) que mapea cada `DynamicFieldType` a un componente React específico. Una fábrica de esquemas Zod (`createFieldValueSchema`) genera validación tipada por campo. Un componente `DynamicForm` recibe `DynamicFieldDefinition[]`, construye el schema, renderiza los campos vía registro usando `FormProvider` + shadcn/ui `FormField`, y devuelve datos validados en `onSubmit`.

- **Pros**: Cero hardcodeo por tipo. Agregar un nuevo tipo activo es registrar un componente. El schema Zod valida tanto en cliente como en servidor (reusable). React Hook Form maneja rendimiento, estado, y errores. shadcn/ui da consistencia visual. Coincide con la arquitectura en capas del proyecto.
- **Contras**: El registro es un punto único de acoplamiento (todos los tipos pasan por él). Los 5 tipos diferidos requieren un componente placeholder que no hace nada real. La validación del lado servidor debe reusar la misma fábrica Zod; si no se reusa, hay divergencia.

### Opción B: Formularios hardcodeados por tipo (rechazada)

Crear un componente de formulario distinto para cada ItemType. Sin abstracción.

- **Pros**: Simple de entender. Cada formulario puede tener lógica y layout específicos.
- **Contras**: No escala — cada nuevo ItemType requiere un formulario nuevo. Duplica validación, renderizado, y manejo de errores. No cumple el requisito de "formularios generados desde definiciones". Rechazada.

### Opción C: Full custom component library (rechazada)

Crear una librería completa de componentes de formulario con motor de renderizado propio, sin depender de React Hook Form ni shadcn/ui.

- **Pros**: Control total sobre el comportamiento y estilos.
- **Contras**: Sobre-ingeniería para el MVP. Duplica funcionalidad que RHF + Zod + shadcn ya proveen. Curva de aprendizaje innecesaria. Mantenimiento costoso a largo plazo. Rechazada.

## Decisión

**Opción A: Field Registry + Zod Schema Factory + React Hook Form + shadcn/ui**.

La decisión sigue la filosofía "lo mínimo que funciona" alineada con la etapa MVP del proyecto. Cada capa tiene una responsabilidad clara:

1. **Zod Schema Factory** (`createFieldValueSchema`): traduce `DynamicFieldType` → Zod base type, aplica reglas de validación por tipo (`min`/`max` para numéricos, `minLength`/`maxLength`/`pattern` para texto, `minDate`/`maxDate` para fechas), maneja `required`/`optional`, e inyecta `defaultValue`. Los tipos diferidos son siempre `.optional()`.

2. **Field Registry** (`fieldRegistry`): `Record<DynamicFieldType, ComponentType<FieldInputProps>>` con 18 entradas — 13 tipos activos con componentes reales y 5 tipos diferidos con `DeferredFieldInput` (placeholder deshabilitado).

3. **FormFieldWrapper**: encargado del layout compartido: label, asterisco de requerido, help text, mensaje de error vía shadcn `FormMessage`. Cada field component recibe `{ field, definition }` del contexto de RHF.

4. **DynamicForm**: Client Component que recibe `fields: DynamicFieldDefinition[]`, genera el schema, inicializa RHF con `zodResolver`, filtra campos inactivos, ordena por `order`, renderiza cada campo activo vía registro, y llama `onSubmit(values)` con datos validados y tipados.

### Tipos activos (13)

| Tipo | Componente | Input HTML |
|------|-----------|------------|
| SHORT_TEXT | `TextFieldInput` | `<Input type="text">` |
| LONG_TEXT | `LongTextFieldInput` | `<Textarea>` |
| NUMBER | `NumberFieldInput` | `<Input type="number">` |
| DECIMAL | `DecimalFieldInput` | `<Input type="number" step="0.01">` |
| CURRENCY | `CurrencyFieldInput` | `<Input>` + sufijo de unidad |
| BOOLEAN | `BooleanFieldInput` | `<Switch>` |
| DATE | `DateFieldInput` | `<Input type="date">` (nativo) |
| DATETIME | `DateTimeFieldInput` | `<Input type="datetime-local">` (nativo) |
| SELECT | `SelectFieldInput` | `<Select>` (shadcn Select) |
| MULTI_SELECT | `MultiSelectFieldInput` | Checkbox group |
| URL | `UrlFieldInput` | `<Input type="url">` |
| EMAIL | `EmailFieldInput` | `<Input type="email">` |
| PHONE | `PhoneFieldInput` | `<Input type="tel">` |

### Tipos diferidos (5)

FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION → `DeferredFieldInput`: `<Input disabled placeholder="Coming soon">`. El schema Zod los trata como `z.string().optional()`. Se desbloquearán en fases futuras cuando exista el contexto necesario (storage de archivos, modelo de ítems, ubicaciones, usuarios).

### Fechas: inputs HTML nativos

DATE y DATETIME usan inputs HTML nativos (`type="date"`, `type="datetime-local"`) en lugar de `react-day-picker` con `Calendar`/`Popover` de shadcn. Los componentes `Calendar` y `Popover` no fueron bootstrappeados en PR 1. Los inputs nativos proveen E/S de fechas funcional con strings ISO y pueden actualizarse a un date picker completo en una iteración futura sin cambiar el contrato del componente.

### Validación

- `createFieldValueSchema` genera un `z.ZodObject` con una key por campo, tipado según `DynamicFieldType`.
- Reglas por tipo: NUMBER/DECIMAL/CURRENCY → `min`/`max`. SHORT_TEXT/LONG_TEXT → `minLength`/`maxLength`/`pattern`. DATE/DATETIME → `minDate`/`maxDate`.
- Campos requeridos (`required: true`) → schema no-optional con `.min(1, ...)` para strings. Campos opcionales → `.optional()` con `.default(defaultValue)` si existe.

## Consecuencias

- **Positivas**: Cero código de formulario hardcodeado — agregar un campo a un ItemType genera automáticamente su input en el formulario. La validación Zod es reusable en API routes (validación server-side). El patrón de registro es extensible: nuevos tipos solo requieren un componente y una entrada en el registro. 33 tests de componente cubren todos los tipos, el wrapper, el registro, y el DynamicForm.
- **Negativas**: 5 tipos diferidos ocupan entradas en el registro y en el schema pero no aportan funcionalidad real — generan ruido visual (placeholder "Coming soon") que puede confundir a usuarios. Las fechas con inputs nativos tienen UX limitada (sin selector de calendario, formato dependiente del locale del navegador). El DynamicForm asume que todos los campos caben en un solo formulario plano — layouts complejos (columnas, secciones, tabs) requerirán una extensión del modelo.
- **Riesgos**: El `DynamicForm` es un Client Component (`"use client"`) — en páginas con muchos campos dinámicos, el bundle JS puede crecer. Si un `DynamicFieldType` se agrega al enum de Prisma pero no tiene entrada en el registro, el formulario lo ignora silenciosamente (`return null`). Esto es seguro pero puede ocultar errores de configuración.
