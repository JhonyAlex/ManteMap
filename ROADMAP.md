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

## Fase 2 — Tipos, campos y estados ✅

**Objetivo**: Sistema configurable de tipos de ítems con campos dinámicos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Tipos de ítem CRUD | ✅ Completado | Crear, leer, actualizar y archivar tipos por proyecto |
| Definición de campos dinámicos | ✅ Completado | 18 tipos de campo soportados, API CRUD, reorder, soft-delete |
| Estados configurables | ✅ Completado | Estados por tipo con 8 propiedades, colores, iconos, CRUD, reorder |
| Formularios generados | ✅ Completado | Formulario se genera desde definición. Field registry, Zod factory, RHF + shadcn/ui |
| Validación de campos | ✅ Completado | Zod valida según definición del campo. Schema factory con reglas por tipo |

**Dependencias**: Fase 1 completada. Fase 2 completada (5 slices: Item Types, Dynamic Fields, Configurable Statuses, Generated Forms, Field Validation).

**Criterio de cierre**:
- ✅ Tipos de ítem CRUD por proyecto
- ✅ 18 tipos de campo dinámico con API CRUD
- ✅ Estados configurables con colores, iconos, y default transaccional
- ✅ Formularios generados desde definiciones (DynamicForm + field registry)
- ✅ Zod schema factory con validación por tipo
- ✅ 8 ADRs documentados (ADR-001 a ADR-008)
- ✅ 423+ tests acumulados en Fase 2
- ✅ Lint, typecheck pasan

---

## Fase 3 — Ítems ✅

**Objetivo**: Gestión completa de ítems/activos con campos dinámicos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| CRUD de ítems (EAV) | ✅ Completado | Item + ItemFieldValue models, JSON value storage |
| API Routes | ✅ Completado | List/create, detail/update/delete, status transitions |
| Listado con filtros | ✅ Completado | Búsqueda por nombre, filtro por tipo/estado, paginación |
| Ficha del ítem | ✅ Completado | Vista completa con campos dinámicos y estado |
| Formularios crear/editar | ✅ Completado | DynamicForm reutilizado con transformación EAV |
| Transiciones de estado | ✅ Completado | isFinal enforcement, auto-assign default status |

**Dependencias**: Fase 2 completada.
**Tests**: 116 (backend) + 106 (UI) = 222
**Archivado**: 2026-07-17

---

## Fase 4 — Documentos ✅

**Objetivo**: Gestión documental con versionado y vencimientos.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| StorageDriver abstraction | ✅ Completado | Interface + LocalStorageDriver (S3-ready) |
| Subida de archivos | ✅ Completado | Upload via multipart FormData, 50MB limit |
| Versionado completo | ✅ Completado | DocumentVersion inmutable con currentVersionId FK |
| Vencimientos | ✅ Completado | expiresAt con badges (rojo=vencido, amarillo=por vencer) |
| API Routes | ✅ Completado | List/create, detail/update/delete, download, versions |
| UI integrada | ✅ Completado | DocumentList, UploadDialog, VersionHistory en item detail |

**Dependencias**: Fase 3 completada.
**Tests**: 131
**Archivado**: 2026-07-18

---

## Fase 5 — Eventos y calendario ✅

**Objetivo**: Sistema de eventos con recurrencia y calendario interactivo.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Event model con RRULE | ✅ Completado | Campo rrule String? para recurrencia |
| FullCalendar integration | ✅ Completado | Dynamic import, day/timegrid views |
| Eventos de expiración | ✅ Completado | Virtuales desde Document.expiresAt |
| EventFormDialog | ✅ Completado | Crear/editar con recurrence picker |
| Color-coded urgency | ✅ Completado | getExpirationColor utility |
| Calendario page | ✅ Completado | /[projectId]/calendar con sidebar nav |

**Dependencias**: Fase 3 y Fase 4 completadas.
**Tests**: 131
**Archivado**: 2026-07-18

---

## Fase 6 — Ubicaciones y planos ✅

**Objetivo**: Jerarquía de ubicaciones, planos interactivos con marcadores.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Jerarquía de ubicaciones | ✅ Completado | Adjacency List, max 5 niveles, cycle detection |
| LocationTree component | ✅ Completado | Vista de árbol recursiva |
| LocationPicker | ✅ Completado | Searchable tree-select para formularios |
| FloorPlan upload | ✅ Completado | Reusa StorageDriver, validación de tipo/tamaño |
| LocationMarker model | ✅ Completado | Coordenadas normalizadas (0-1) |
| React Konva viewer | ✅ Completado | Dynamic import, zoom/pan, draggable markers |
| LOCATION_RELATION field | ✅ Completado | Activado en field-registry para DynamicForm |

**Dependencias**: Fase 3 completada.
**Tests**: 311
**Archivado**: 2026-07-18

---

## Fase 7 — Alertas y notificaciones ✅

**Objetivo**: Alertas proactivas para vencimientos, mantenimiento y cambios de estado.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Alert model | ✅ Completado | Tipos, severidad, estado, deduplicación por unique constraint |
| Hybrid generation | ✅ Completado | Event hooks + scan endpoint (doc expiration, events) |
| Service hooks | ✅ Completado | Fire-and-forget en item/document services |
| AlertBell component | ✅ Completado | Badge con unread count + dropdown |
| Alert dashboard | ✅ Completado | /[projectId]/alerts con filtros |
| Notification preferences | ✅ Completado | Toggles por tipo de alerta por proyecto |

**Dependencias**: Fase 4 y Fase 5 completadas.
**Tests**: 166
**Archivado**: 2026-07-18

---

## Fase 8 — Panel e informes 🔜 Siguiente

**Objetivo**: Dashboard con indicadores y exportación.

| Entregable | Estado | Criterio de aceptación |
|-----------|--------|----------------------|
| Dashboard principal | ⬜ Pendiente | KPIs, vencimientos, actividad |
| Indicadores | ⬜ Pendiente | Ítems activos/inactivos, docs pendientes |
| Exportación CSV | ⬜ Pendiente | Exportar listados filtrados |

**Dependencias**: Fases 3-7 completadas.

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

El MVP corresponde a las **Fases 0–7** completas (nuestro Phase 8 = ROADMAP Fase 7).

Debe permitir:
1. Iniciar sesión
2. Crear proyecto
3. Crear tipo de ítem con campos personalizados
4. Crear estados
5. Crear ítems con campos dinámicos
6. Adjuntar documentos con versionado
7. Crear eventos con recurrencia
8. Ver calendario
9. Crear ubicaciones jerárquicas
10. Subir planos y posicionar ítems
11. Abrir ficha desde el plano
12. Recibir alertas proactivas
13. Configurar preferencias de notificación

---

> **Última actualización**: 2026-07-18. Phases 2-8 completas vía SDD: Item Types, Dynamic Fields, Statuses, Generated Forms, Items CRUD+UI, Documents, Events & Calendar, Locations & Floor Plans, Alerts & Notifications. ~1,800+ tests. Próxima fase: Dashboard & Reports. Production Prisma baseline (ADR-005) sigue siendo prerequisito para despliegue.
