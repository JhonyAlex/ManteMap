# Tasks: Phase 7 — Locations

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,400 (17 new files, 4 modified, ~18 test files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Location schema + validation + repo + service | PR 1 | `pnpm --filter @mantemap/database test && pnpm --filter @mantemap/validation test && pnpm --filter mantemap test -- --testPathPattern="location-(repository\|service)"` | N/A — pure data/logic layer, no UI | Drop Location model, delete 4 new files |
| 2 | Location API + components + hooks + item integration | PR 2 | `pnpm --filter mantemap test -- --testPathPattern="locations/|use-locations|item-(repository\|service)"` | `curl /api/projects/{id}/locations` | Delete API routes + components, revert item-repo/service changes |
| 3 | FloorPlan + Marker schema, validation, repo, service, API | PR 3 | `pnpm --filter mantemap test -- --testPathPattern="floor-plan"` | `curl /api/projects/{id}/floor-plans` | Drop FloorPlan/LocationMarker models, delete 6 new files |
| 4 | React Konva viewer + LOCATION_RELATION activation | PR 4 | `pnpm --filter mantemap test -- --testPathPattern="floor-plan-viewer\|marker-layer\|field-registry"` | Navigate to floor plan page in browser | Uninstall react-konva, revert field-registry, delete 5 new files |

## Phase 1: Foundation — Schema, Validation, Repos, Services (PR 1)

- [x] 1.1 RED: Write failing tests for `createLocationSchema` and `updateLocationSchema` in `packages/validation/src/location.test.ts`
- [x] 1.2 GREEN: Create `packages/validation/src/location.ts` with Zod schemas (name 1-200 chars, parentId cuid, level 0-4, order int)
- [x] 1.3 REFACTOR: Extract shared `idSchema` if duplicated across validation package
- [x] 1.4 Add `Location`, `FloorPlan`, `LocationMarker` models to `packages/database/prisma/schema.prisma`; add `locationId` FK to `Item` model
- [x] 1.5 RED: Write failing tests for `LocationRepository` (create, findById, findTree, reorder, delete cascade) in `apps/web/src/lib/repositories/location-repository.test.ts`
- [x] 1.6 GREEN: Create `apps/web/src/lib/repositories/location-repository.ts` with Prisma data access
- [x] 1.7 RED: Write failing tests for `LocationService` (depth validation, cycle detection, project scoping) in `apps/web/src/lib/services/location-service.test.ts`
- [x] 1.8 GREEN: Create `apps/web/src/lib/services/location-service.ts` with `validateLocationDepth()`, CRUD, tree assembly
- [x] 1.9 REFACTOR: Verify lint, typecheck, all PR 1 tests pass

## Phase 2: Location API, UI, Hooks, Item Integration (PR 2)

- [x] 2.1 RED: Write failing tests for location API routes (CRUD, tree, reorder, project scoping) in `apps/web/src/app/api/projects/[projectId]/locations/route.test.ts`
- [x] 2.2 GREEN: Create API routes: `locations/route.ts` (list, create), `locations/[locationId]/route.ts` (get, update, delete), `locations/tree/route.ts`, `locations/reorder/route.ts`
- [x] 2.3 RED: Write failing tests for `LocationTree` component (renders hierarchy, expand/collapse) in `apps/web/src/components/locations/location-tree.test.tsx`
- [x] 2.4 GREEN: Create `apps/web/src/components/locations/location-tree.tsx`
- [x] 2.5 RED: Write failing tests for `LocationPicker` (searchable tree-select, display path, clear) in `apps/web/src/components/locations/location-picker.test.tsx`
- [x] 2.6 GREEN: Create `apps/web/src/components/locations/location-picker.tsx`
- [x] 2.7 RED: Write failing tests for `useLocations` hook (tree query, CRUD mutations) in `apps/web/src/hooks/use-locations.test.ts`
- [x] 2.8 GREEN: Create `apps/web/src/hooks/use-locations.ts` with TanStack Query hooks
- [x] 2.9 Modify `apps/web/src/lib/repositories/item-repository.ts`: add `locationId` to CreateItemData, include location in list/detail queries, add locationId filter
- [x] 2.10 Modify `apps/web/src/lib/services/item-service.ts`: pass through locationId
- [x] 2.11 REFACTOR: Verify lint, typecheck, all PR 2 tests pass

## Phase 3: FloorPlan + Marker Models, Validation, API (PR 3)

- [x] 3.1 RED: Write failing tests for `createFloorPlanSchema`, `createMarkerSchema` in `packages/validation/src/floor-plan.test.ts`
- [x] 3.2 GREEN: Create `packages/validation/src/floor-plan.ts` (format validation, size limit, coordinate 0-1 range)
- [x] 3.3 RED: Write failing tests for `FloorPlanRepository` (create, findByLocation, marker CRUD) in `apps/web/src/lib/repositories/floor-plan-repository.test.ts`
- [x] 3.4 GREEN: Create `apps/web/src/lib/repositories/floor-plan-repository.ts`
- [x] 3.5 RED: Write failing tests for `FloorPlanService` (upload via StorageDriver, marker coordinate validation, cascade delete) in `apps/web/src/lib/services/floor-plan-service.test.ts`
- [x] 3.6 GREEN: Create `apps/web/src/lib/services/floor-plan-service.ts` with StorageDriver integration
- [x] 3.7 RED: Write failing tests for floor plan API routes (upload, CRUD, marker CRUD, project scoping) in `apps/web/src/app/api/projects/[projectId]/floor-plans/route.test.ts`
- [x] 3.8 GREEN: Create API routes: `floor-plans/route.ts`, `floor-plans/[floorPlanId]/route.ts`, `floor-plans/[floorPlanId]/markers/route.ts`, `floor-plans/[floorPlanId]/markers/[markerId]/route.ts`
- [x] 3.9 RED: Write failing tests for `useFloorPlans` hook in `apps/web/src/hooks/use-floor-plans.test.ts`
- [x] 3.10 GREEN: Create `apps/web/src/hooks/use-floor-plans.ts`
- [x] 3.11 REFACTOR: Verify lint, typecheck, all PR 3 tests pass

## Phase 4: React Konva Viewer + LOCATION_RELATION Activation (PR 4)

- [x] 4.1 Install `react-konva` and `konva` dependencies in `apps/web`
- [x] 4.2 RED: Write failing tests for `FloorPlanViewer` (canvas render, zoom/pan, responsive resize) in `apps/web/src/components/floor-plans/floor-plan-viewer.test.tsx`
- [x] 4.3 GREEN: Create `apps/web/src/components/floor-plans/floor-plan-viewer.tsx` with `dynamic(() => import(...), { ssr: false })`
- [x] 4.4 RED: Write failing tests for `MarkerLayer` (render markers at normalized coords, drag reposition, click-to-open card) in `apps/web/src/components/floor-plans/marker-layer.test.tsx`
- [x] 4.5 GREEN: Create `apps/web/src/components/floor-plans/marker-layer.tsx` with draggable markers
- [x] 4.6 RED: Write failing tests for `ViewerToolbar` (type/status filters, reset view) in `apps/web/src/components/floor-plans/viewer-toolbar.test.tsx`
- [x] 4.7 GREEN: Create `apps/web/src/components/floor-plans/viewer-toolbar.tsx`
- [x] 4.8 Modify `apps/web/src/components/forms/field-registry.ts`: map LOCATION_RELATION → LocationPicker, remove DeferredField placeholder
- [x] 4.9 Update Zod schema factory: LOCATION_RELATION validates as `z.string().cuid()` (required) or `z.string().cuid().optional()` (optional)
- [x] 4.10 REFACTOR: Verify lint, typecheck, build, all tests pass
