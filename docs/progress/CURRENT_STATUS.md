# Estado actual — ManteMap

> Última actualización: 2026-07-20

---

## Fase activa

**Fases 0-10 completadas.** La unidad `floor-plan-isolation-maintenance-design` cerró su revisión nativa con `post-apply: allow`. La persistencia de mantenimiento (modelo/migración) permanece diferida a una unidad posterior.

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
| Fase 10 | External Notifications (dispatcher, 4 canales, channel config UI, delivery log) | 203 | ✅ |
| **Total** | **19 dominios de specs, 11 cambios SDD archivados** | **~2,003** | ✅ |

---

## Despliegue en producción

- **URL**: https://mante.saharapro.team/
- **Plataforma**: Dokploy + Docker Swarm
- **Base de datos**: PostgreSQL 16 (servicio Swarm `mantemap-db-7nrNyw`)
- **Estado**: Landing page funcionando. Deploy de fases 7-10 en curso (push a master → Dokploy auto-deploy).
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
- ✅ 11 cambios SDD archivados con specs, design docs y verify reports.
- ✅ 19 dominios de specs en openspec/specs/.
- ✅ ~2,003 tests unitarios/componente/integración.
- ✅ Notificaciones externas: 4 canales (Email, Slack, Teams, Telegram), dispatcher, channel config UI y delivery audit log.
- ✅ Aislamiento por proyecto de ubicaciones, planos, marcadores e ítems asociados, con conflictos de asociación duplicada controlados.

## Qué está incompleto

- Deploy de fases 7-10 en producción (migraciones pendientes de aplicar vía Dokploy auto-deploy).
- Seed de demostración.
- Preference-based alert filtering (deferido de Fase 8).
- Dominio de mantenimiento preventivo: diseñado en ADR-009, todavía sin modelos, migración, generador, calendario, panel, alertas ni onboarding.

## Qué errores existen

- Known: Windows production build may fail at standalone symlink creation with `EPERM`.
- Known: el typecheck raíz mantiene un fallo preexistente: `packages/shared/src/types/metrics.test.ts` no resuelve los tipos/módulo de `vitest`.
- Known: 51 tests de integración requieren una PostgreSQL de pruebas aislada; la suite offline queda en 2,172 passed, 51 failed y 44 skipped. Ver `docs/testing/database-test-isolation.md`.

## Última validación de remediación

- ✅ Revisión nativa de aislamiento: `review-floor-plan-isolation-evidence-v3` — `post-apply: allow`.
- ✅ `pnpm --filter @mantemap/web typecheck` pasa.
- ⚠️ El typecheck raíz mantiene el fallo preexistente de tipos/módulo `vitest` en `packages/shared/src/types/metrics.test.ts`.
- ⚠️ Los tests raíz mantienen los fallos dependientes de PostgreSQL documentados (51 pruebas de integración sin base aislada).
- ⚠️ El build raíz conserva el riesgo conocido de Windows: creación de symlink standalone con `EPERM`.

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
pnpm --filter @mantemap/web typecheck  # ✅ Pass
pnpm typecheck         # ⚠️ Falla por tipos/módulo vitest preexistentes en packages/shared
pnpm build             # ⚠️ Riesgo conocido: standalone symlink EPERM en Windows
pnpm test              # ⚠️ 51 integraciones requieren PostgreSQL aislada
```

---

## Última migración

`20260718150342_add_all_phase_models` — generada via `prisma migrate diff`. Agrega 4 enums (DynamicFieldType, AlertType, AlertSeverity, AlertStatus) y 12 tablas (dynamic_fields, statuses, items, item_field_values, locations, floor_plans, location_markers, documents, document_versions, alerts, notification_preferences, events). Excluye ItemType (ya existe en producción).

## Último commit

`6b103f4` — fix: enforce project isolation and atomic marker associations

## Próxima tarea concreta

Crear la unidad `feature/maintenance-model-migration` desde `master` actualizado para implementar únicamente el modelo y la migración aditiva de mantenimiento. La generación, calendario, panel, alertas y onboarding quedan fuera de ese alcance.
