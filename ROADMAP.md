# ROADMAP — ManteMap

Hoja de ruta de desarrollo por fases.

---

## Fase 0 — Descubrimiento y arquitectura ✅

**Objetivo**: Establecer la base técnica y estructura del proyecto.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Análisis del proyecto | ✅ Completado | PROMPT MAESTRO analizado y arquitectura propuesta |
| Arquitectura definida | ✅ Completado | Stack, patrones y estructura documentados |
| Modelo de datos inicial | ✅ Completado | Schema Prisma base con User, Project, Account, Session |
| ADR principales | ✅ Completado | ADR-001 a ADR-004 creados |
| Estructura del repositorio | ✅ Completado | Monorepo con apps/ y packages/ |
| AGENTS.md | ✅ Completado | Guía completa para IAs |
| ROADMAP.md | ✅ Completado | Este archivo |
| Entorno Docker | ✅ Completado | PostgreSQL 16 con healthcheck |
| Base de datos conectada | ✅ Completado | Schema Prisma genera cliente correctamente |
| Aplicación mínima ejecutándose | ✅ Completado | Next.js compila y genera páginas |
| Lint + Typecheck | ✅ Completado | Pasan sin errores |
| Build de producción | ✅ Completado | `pnpm build` completa sin errores |
| Despliegue en producción | ✅ Completado | https://mante.saharapro.team/ funcionando |

**Criterio de cierre**:
- ✅ El proyecto levanta correctamente
- ✅ La base de datos responde (schema validado con `prisma db push`)
- ✅ Lint y typecheck funcionan
- ✅ Build de producción funciona
- ✅ La documentación explica cómo continuar
- ✅ **Desplegado en producción**

**Dependencias**: Ninguna (es la fase inicial).

---

## Fase 1 — Usuarios y proyectos ✅

**Objetivo**: Autenticación, gestión de usuarios y proyectos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Autenticación (login/logout) | ✅ Completado | Sesión se crea y destruye correctamente |
| Registro de usuarios | ✅ Completado | Nuevo usuario puede crear cuenta |
| Roles básicos | ✅ Completado | Admin, Gestor, Técnico, Consulta |
| CRUD de proyectos | ✅ Completado | Crear, leer, actualizar, archivar proyectos |
| Acceso por proyecto | ✅ Completado | Usuario solo ve proyectos asignados |
| Layout principal | ✅ Completado | Sidebar, breadcrumbs, contenido responsive |
| Permisos en servidor | ✅ Completado | API valida permisos antes de ejecutar |

**Dependencias**: Fase 0 completada.

---

## Fase 2 — Tipos, campos y estados 🔄 Activa

**Objetivo**: Sistema configurable de tipos de ítems con campos dinámicos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Tipos de ítem CRUD | 🔄 Slice 1 actual | Crear, leer, actualizar y archivar tipos por proyecto |
| Definición de campos dinámicos | ✅ Completado | 18 tipos de campo soportados, API CRUD, reorder, soft-delete |
| Estados configurables | ⬜ Pendiente | Estados por tipo con colores e iconos |
| Formularios generados | ⬜ Pendiente | Formulario se genera desde definición |
| Validación de campos | ⬜ Pendiente | Zod valida según definición del campo |

**Dependencias**: Fase 1 completada. Dynamic fields and configurable statuses are deferred after Slice 1.

---

## Fase 3 — Ítems

**Objetivo**: Gestión completa de ítems/activos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| CRUD de ítems | ⬜ Pendiente | Crear, editar, eliminar ítems |
| Ficha del ítem | ⬜ Pendiente | Vista completa con pestañas |
| Listado con filtros | ⬜ Pendiente | Búsqueda, filtros, orden, paginación |
| Historial básico | ⬜ Pendiente | Cambios registrados automáticamente |

**Dependencias**: Fase 2 completada.

---

## Fase 4 — Documentos

**Objetivo**: Gestión documental con vencimientos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Subida de archivos | ⬜ Pendiente | Upload a almacenamiento local/S3 |
| Metadatos de documentos | ⬜ Pendiente | Nombre, tipo, fechas, versión |
| Vencimientos | ⬜ Pendiente | Fecha de vencimiento con alertas |
| Versiones iniciales | ⬜ Pendiente | Historial de reemplazos |

**Dependencias**: Fase 3 completada.

---

## Fase 5 — Eventos y calendario

**Objetivo**: Sistema de eventos con recurrencia y calendario.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Eventos CRUD | ⬜ Pendiente | Crear/editar eventos por ítem |
| Recurrencia | ⬜ Pendiente | Múltiples patrones soportados |
| Calendario | ⬜ Pendiente | Vista de día/semana/mes |
| Alertas internas | ⬜ Pendiente | Notificaciones por vencimientos |

**Dependencias**: Fase 3 completada.

---

## Fase 6 — Ubicaciones

**Objetivo**: Jerarquía de ubicaciones y movimiento de ítems.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Jerarquía de ubicaciones | ⬜ Pendiente | Centro > Edificio > Planta > Área > Subárea |
| Movimiento de ítems | ⬜ Pendiente | Mover entre ubicaciones con historial |
| Historial de ubicación | ⬜ Pendiente | Traza completa de cambios |

**Dependencias**: Fase 3 completada.

---

## Fase 7 — Planos

**Objetivo**: Planos interactivos con marcadores.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Subida de planos | ⬜ Pendiente | PNG, JPG, WEBP, SVG |
| Visualización | ⬜ Pendiente | Zoom, pan, responsive |
| Marcadores | ⬜ Pendiente | Posicionar ítems con coordenadas normalizadas |
| Modo edición | ⬜ Pendiente | Arrastrar/mover marcadores |
| Filtros en plano | ⬜ Pendiente | Filtrar por tipo, estado, capa |
| Acceso a ficha | ⬜ Pendiente | Click en marcador abre ficha |

**Dependencias**: Fase 3 y Fase 6 completadas.

---

## Fase 8 — Panel e informes

**Objetivo**: Dashboard con indicadores y exportación.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Dashboard principal | ⬜ Pendiente | KPIs, vencimientos, actividad |
| Indicadores | ⬜ Pendiente | Ítems activos/inactivos, docs pendientes |
| Exportación CSV | ⬜ Pendiente | Exportar listados filtrados |

**Dependencias**: Fase 3 completada.

---

## Fase 9 — Funciones avanzadas

**Objetivo**: Funcionalidades extendidas.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Códigos QR | ⬜ Evaluar | QR imprimible por ítem |
| Inspecciones móviles | ⬜ Evaluar | Escanear QR → ver ficha |
| Webhooks | ⬜ Evaluar | Notificaciones a sistemas externos |
| Notificaciones externas | ⬜ Evaluar | Email, Teams, Slack, Telegram |
| Polígonos en planos | ⬜ Evaluar | Dibujar zonas interactivas |
| Capas | ⬜ Evaluar | Filtrar por capas temáticas |
| Exportación PDF | ⬜ Evaluar | Fichas e informes en PDF |
| OCR / IA documental | ⬜ Evaluar | Extracción automática de fechas |

**Dependencias**: Fase 8 completada.

---

## MVP

El MVP corresponde a las **Fases 0–7** completas.

Debe permitir:
1. Iniciar sesión
2. Crear proyecto
3. Crear tipo de ítem con campos personalizados
4. Crear estados
5. Crear ítems
6. Adjuntar documentos
7. Crear eventos con recurrencia
8. Ver calendario
9. Crear ubicaciones
10. Subir planos y posicionar ítems
11. Abrir ficha desde el plano
12. Consultar historial

---

> **Última actualización**: 2026-07-17. Phase 2 Slice 2 (Dynamic Fields) completed; Slice 3 (configurable statuses) is next. Production Prisma baseline remains an operational prerequisite.
