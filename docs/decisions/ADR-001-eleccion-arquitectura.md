# ADR-001: Elección de arquitectura

## Estado

Aceptada

## Fecha

2026-07-15

## Contexto

Se necesita elegir la arquitectura base para ManteMap, una plataforma de gestión documental, activos, vencimientos y planos interactivos. El sistema debe ser:
- Moderno y mantenible
- Autoalojable
- Escalable progresivamente
- Desarrollable por un equipo pequeño o un solo desarrollador

## Opciones consideradas

### Opción A: Next.js full-stack (App Router)

- Frontend y backend en un mismo proyecto.
- Server Components + API Routes.
- Menor complejidad operativa.
- Un solo proceso de despliegue.

### Opción B: Next.js + NestJS separados

- Frontend Next.js.
- API REST/GraphQL en NestJS.
- Mayor separación de capas.
- Mayor complejidad operativa.
- Dos procesos de despliegue.

### Opción C: Next.js + API serverless

- Frontend Next.js.
- API en serverless functions.
- Escalabilidad automática.
- Vendor lock-in.

## Decisión

**Opción A: Next.js full-stack (App Router)**

## Motivo

1. **Simplicidad operativa**: Un solo proyecto, un solo proceso de despliegue, una sola base de código.
2. **Velocidad de desarrollo**: Server Components eliminan la necesidad de crear endpoints para cada vista.
3. **Separación de responsabilidades**: Se logra mediante la capa de servicios y repositorios, no mediante proyectos separados.
4. **Escalabilidad suficiente**: Para el volumen esperado de usuarios, Next.js es más que suficiente.
5. **Ecosistema maduro**: shadcn/ui, TanStack Query, Prisma tienen excelente integración con Next.js.
6. **Despliegue simple**: Docker + Docker Compose sin necesidad de orquestar múltiples servicios.

Si en el futuro se necesita una API separada, la capa de servicios permite extraerla sin reescribir lógica de negocio.

## Consecuencias

- La lógica de negocio vive en `apps/web/src/lib/services/`.
- Las API Routes son la capa de exposición HTTP.
- Los componentes no acceden directamente a Prisma.
- La separación se logra por convención, no por infraestructura.
