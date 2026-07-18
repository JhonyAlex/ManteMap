# Estado actual — ManteMap

> Última actualización: 2026-07-18

---

## Fase activa

**Todas las fases del MVP (0-9) completadas.** Próxima: **Fase 10 — Notificaciones externas**.

### Fases completadas

| Fase | Entregable | Tests | Estado |
|------|-----------|-------|--------|
| Fase 0 | Arquitectura, monorepo, Docker, configs | N/A | ✅ |
| Fase 1 | Auth, proyectos, acceso por proyecto, shell protegido | ~200 | ✅ |
| Fase 2 | ItemTypes, DynamicFields (18 tipos), Statuses, DynamicForm | 423+ | ✅ |
| Fase 3 | Items CRUD (EAV con JSON value), API routes, transiciones de estado | 222 | ✅ |
| Fase 4 | Items UI (listado, detalle, formularios crear/editar, dropdown estado) | ✅ |
| Fase 5 | Documentos (upload, versionado, expiración, StorageDriver) | 131 | ✅ |
| Fase 6 | Eventos y Calendario (FullCalendar, recurrencia RRULE, eventos de expiración) | 131 | ✅ |
| Fase 7 | Locations (jerarquía, planos, visor React Konva, LOCATION_RELATION) | 311 | ✅ |
| Fase 8 | Alerts & Notifications (generación híbrida, campana, preferencias) | 166 | ✅ |
| Fase 9 | Dashboard & Reports (KPIs, timeline, CSV export, global dashboard) | 177 | ✅ |
| **Total** | **17 dominios de specs, 9 cambios SDD archivados** | **~1,800+** | ✅ |

---

## Despliegue en producción

- **URL**: https://mante.saharapro.team/
- **Plataforma**: Dokploy + Docker Swarm
- **Base de datos**: PostgreSQL 16 (servicio Swarm `mantemap-db-7nrNyw`)
- **Estado**: Landing page funcionando. Deploy de fases 7-9 en curso (push a master → Dokploy auto-deploy).
- **Migraciones**: `20260717000000_baseline_production_schema` (baseline — marked as applied) + `20260717000100_add_item_types` (applied) + `20260718150342_add_all_phase_models` (pending deploy). ADR-005 resuelto.

### Notas del despliegue

1. `next.config.ts` tiene `output: 'standalone'` para el build Docker.
2. Dokploy detecta cambios en `master` y hace rebuild + redeploy automático.
3. `migration_lock.toml` establecido en `packages/database/prisma/migrations/`.
4. Healthcheck usa `127.0.0.1` (compatibilidad IPv4 con Alpine).
5. ADR-005: baseline aplicado, ItemType ya existe en producción, nueva migración solo agrega modelos faltantes (DynamicField → Event).

---

## Qué funciona realmente

- ✅ Monorepositorio con pnpm workspaces + Turborepo.
- ✅ Next.js 15 con App Router.
- ✅ Autenticación, proyectos, roles, acceso scoped.
- ✅ 18 tipos de campos dinámicos con formularios generados.
- ✅ Estados configurables con colores, iconos, transiciones.
- ✅ Items CRUD con EAV (JSON value storage).
- ✅ Documentos con versionado y vencimientos.
- ✅ Eventos con recurrencia (RRULE) y calendario FullCalendar.
- ✅ Jerarquía de ubicaciones (max 5 niveles, cycle detection).
- ✅ Planos interactivos con React Konva y markers arrastrables.
- ✅ Alertas proactivas con generación híbrida y campana de notificaciones.
- ✅ Dashboard de proyecto con 6 grupos de KPIs y timeline.
- ✅ Dashboard global cross-project.
- ✅ Exportación CSV con prevención de inyección de fórmulas.
- ✅ 3 nuevos primitivos UI: Card, Progress, Skeleton.
- ✅ 9 cambios SDD archivados con specs, design docs y verify reports.
- ✅ 17 dominios de specs en openspec/specs/.
- ✅ ~1,800+ tests unitarios/componente/integración.

## Qué está incompleto

- Deploy de fases 7-9 en producción (migración `20260718150342_add_all_phase_models` pendiente de aplicar vía Dokploy auto-deploy).
- Seed de demostración.
- Preference-based alert filtering (deferido de Fase 8).
- Fase 10: Notificaciones externas (Email, Slack, Teams, Telegram).

## Qué errores existen

- Known: Windows production build may fail at standalone symlink creation with `EPERM`.
- Known: @mantemap/ui tiene error de typecheck pre-existente (@/lib/utils resolution).
- Known: 51 integration tests requieren Docker/DB (pre-existente).

---

## Cómo levantar el entorno local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Iniciar desarrollo
pnpm dev
```

## Qué comando ejecutar para validar

```bash
pnpm lint              # ✅ Pass
pnpm typecheck         # ✅ Pass
pnpm build             # Known Windows standalone symlink EPERM risk
pnpm test              # ✅ ~1,800+ unit/component, 51 integration (DB offline)
```

---

## Última migración

`20260718150342_add_all_phase_models` — generada via `prisma migrate diff`. Agrega 4 enums (DynamicFieldType, AlertType, AlertSeverity, AlertStatus) y 12 tablas (dynamic_fields, statuses, items, item_field_values, locations, floor_plans, location_markers, documents, document_versions, alerts, notification_preferences, events). Excluye ItemType (ya existe en producción).

## Último commit

`d22a683` — chore: replace ItemType-only migration with comprehensive all-models migration

## Próxima tarea concreta

**Fase 10 — Notificaciones externas**: integrar canales de notificación (Email, Slack, Teams, Telegram) con el sistema de alertas de la Fase 8. Permitir que los usuarios reciban avisos de vencimientos, cambios de estado y eventos sin estar logueados en la app.
