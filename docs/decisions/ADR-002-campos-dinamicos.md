# ADR-002: Diseño de campos dinámicos

## Estado

Aceptada

## Fecha

2026-07-15

## Contexto

Cada tipo de ítem (máquina, extintor, contrato, etc.) puede definir sus propios campos. Se necesita un modelo de datos que permita:
- Definir campos dinámicamente por tipo de ítem.
- Almacenar valores de campos variables.
- Validar valores según el tipo de campo.
- Consultar y filtrar por campos dinámicos.
- Mantener rendimiento razonable.

## Opciones consideradas

### Opción A: Entity-Attribute-Value (EAV)

- Tabla `field_definitions` + tabla `field_values`.
- Cada valor es una fila.
- Máxima flexibilidad.
- Consultas complejas y lentas para muchos campos.
- Difícil de validar.

### Opción B: JSONB puro

- Todos los valores en una columna JSONB.
- Consultas rápidas con operadores JSONB.
- Sin esquema de definiciones.
- Difícil de validar y mantener.
- Sin metadatos de campos.

### Opción C: Tablas dinámicas

- Generar tablas por tipo de ítem.
- Rendimiento óptimo.
- Muy complejo de mantener.
- Migraciones automáticas problemáticas.

### Opción D: Modelo híbrido

- Definiciones normalizadas en tabla `dynamic_field_definitions`.
- Valores en columna JSONB en la tabla del ítem.
- Campos comunes como columnas reales.
- Validación mediante Zod/JSON Schema.
- Índices GIN en JSONB para campos frecuentemente consultados.

## Decisión

**Opción D: Modelo híbrido**

## Motivo

1. **Definiciones normalizadas**: La tabla `dynamic_field_definitions` almacena metadatos de cada campo (nombre, tipo, validación, orden, etc.).
2. **Valores en JSONB**: Los valores dinámicos se almacenan en una columna JSONB (`dynamic_data`) en la tabla del ítem. Esto evita crear miles de filas en una tabla EAV.
3. **Campos comunes como columnas**: Los campos que todos los ítems comparten (nombre, código, estado, responsable) son columnas reales con constraints e índices nativos.
4. **Validación en capa de aplicación**: Zod genera el esquema de validación dinámicamente desde las definiciones de campos.
5. **Rendimiento**: PostgreSQL tiene soporte nativo para índices GIN en JSONB, permitiendo filtros eficientes.
6. **Flexibilidad**: Se pueden añadir nuevos tipos de campo sin migraciones.

## Consecuencias

- `dynamic_field_definitions`: tabla normalizada con definiciones.
- `items.dynamic_data`: columna JSONB con valores.
- Validación dinámica generada desde definiciones.
- Índices GIN en campos frecuentemente filtrados.
- ADR separado para documentar los tipos de campo soportados.
