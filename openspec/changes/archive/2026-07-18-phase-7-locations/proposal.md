# Proposal: Phase 7 — Locations

## Intent

ManteMap lacks spatial context for assets. Users cannot organize items by physical location (center → building → floor → room → zone) or visualize them on floor plans. This phase adds hierarchical locations, floor plan management with interactive markers, and activates the deferred `LOCATION_RELATION` field type — completing the spatial dimension of the MVP.

## Scope

### In Scope
- Location model with adjacency-list hierarchy (max 5 levels: Center, Building, Floor, Room, Zone)
- Location CRUD with project-scoped access, tree API, reorder
- FloorPlan model with upload via existing StorageDriver (local/S3)
- LocationMarker model with normalized coordinates (0-1) on floor plans
- React Konva floor plan viewer with zoom/pan, draggable markers, layer filters
- `LOCATION_RELATION` field type activation in field registry + LocationPicker component
- `locationId` FK on Item model for direct location assignment

### Out of Scope
- Location movement history (audit trail) — deferred to future phase
- Polygon/zone drawing on floor plans — Phase 9
- QR code generation per location — Phase 9
- Advanced BIM/GIS integration
- Mobile-native floor plan interaction

## Capabilities

### New Capabilities
- `location-hierarchy`: Location model (adjacency list, parentId self-reference), CRUD API, tree endpoint, max 5 levels enforced in service, project-scoped access
- `floor-plan-management`: FloorPlan + LocationMarker models, image upload via StorageDriver, marker CRUD with normalized coordinates
- `floor-plan-viewer`: React Konva canvas viewer with dynamic import (~100KB), zoom/pan, draggable markers, click-to-open item card, type/status layer filters
- `location-assignment`: LocationPicker component for items, `locationId` FK on Item, location field in create/edit item forms

### Modified Capabilities
- `dynamic-field-management`: Activate `LOCATION_RELATION` enum value as a fully functional field type (currently defined in schema but treated as deferred)
- `form-generation`: Replace `LOCATION_RELATION` placeholder (`DeferredField`) with real `LocationPicker` component in field registry
- `item-management`: Add optional `locationId` foreign key to Item model; include location in list/detail queries

## Approach

**Hierarchy**: Adjacency List — `parentId` self-referential FK in Prisma. Shallow tree (max 5 levels) avoids deep recursion. `$queryRaw` for ancestor/path queries when needed. Consistent with existing Prisma patterns.

**Storage**: Reuse `StorageDriver` from Phase 5. Floor plans are binary assets like documents — same pipeline, same config.

**Viewer**: React Konva with `dynamic(() => import(...), { ssr: false })` for lazy loading. Normalized coordinates (0-1) for portability across zoom levels.

**Slices** (4 deliverables, each within 400-line budget):
1. Location model + CRUD (schema, repo, service, API, validation, tests)
2. Floor plan model + upload (FloorPlan, LocationMarker, StorageDriver integration)
3. React Konva viewer (canvas, markers, zoom/pan, filters)
4. Location picker for items (LOCATION_RELATION activation, Item.locationId, forms)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modified | Add Location, FloorPlan, LocationMarker models; Item.locationId FK |
| `packages/validation/src/location.ts` | New | Zod schemas for Location CRUD |
| `apps/web/src/lib/repositories/location-repository.ts` | New | Data access layer |
| `apps/web/src/lib/services/location-service.ts` | New | Business logic, depth enforcement |
| `apps/web/src/app/api/projects/[projectId]/locations/` | New | CRUD + tree API routes |
| `apps/web/src/app/api/projects/[projectId]/floor-plans/` | New | Upload, CRUD, marker API routes |
| `apps/web/src/components/locations/` | New | LocationTree, LocationPicker |
| `apps/web/src/components/floor-plans/` | New | FloorPlanViewer, markers, toolbar |
| `apps/web/src/components/forms/field-registry.ts` | Modified | LOCATION_RELATION → LocationPicker |
| `apps/web/src/hooks/use-locations.ts` | New | TanStack Query hooks |
| `apps/web/src/lib/repositories/item-repository.ts` | Modified | Add locationId to filters |
| `apps/web/src/lib/services/item-service.ts` | Modified | Pass through locationId |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prisma production baseline (ADR-005) blocks deployment | High | Dev proceeds with `prisma db push`; deployment requires baseline procedure first |
| React Konva bundle size (~100KB) | Medium | Dynamic import with `ssr: false`; only loads on floor plan pages |
| Large floor plan images (10MB+) | Medium | Validate max upload size, server-side compression, cache headers |
| Recursive CTEs for ancestor queries | Low | Max 5 levels enforced; `$queryRaw` used sparingly |
| Marker coordinate drift on zoom | Low | Normalized coordinates (0-1) independent of resolution |

## Rollback Plan

1. Remove `Location`, `FloorPlan`, `LocationMarker` models from Prisma schema — `prisma db push` or new migration
2. Remove `locationId` FK from `Item` model
3. Revert `LOCATION_RELATION` to `DeferredField` placeholder in field registry
4. Delete new API routes, components, hooks, services, repositories
5. Remove `react-konva` and `konva` from dependencies
6. No data loss — new tables only, no existing data modified

## Dependencies

- Phase 3 (Items) complete ✅
- Phase 5 (Document Management) complete ✅ — StorageDriver reuse
- `react-konva` + `konva` npm packages (to be installed)
- Prisma production baseline (ADR-005) for deployment — not a dev blocker

## Success Criteria

- [ ] Location CRUD with max 5 levels, project-scoped access
- [ ] Floor plan upload/display via StorageDriver
- [ ] React Konva viewer with zoom/pan and draggable markers
- [ ] Items assignable to locations via `locationId` FK
- [ ] `LOCATION_RELATION` field type fully functional in forms
- [ ] All new code has unit + integration tests
- [ ] Lint, typecheck, and build pass
