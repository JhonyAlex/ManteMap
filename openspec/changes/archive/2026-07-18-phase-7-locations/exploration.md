# Exploration: Phase 7 — Locations

## Current State

### What Exists

- **Items (Phase 3-6 complete)**: Item CRUD with EAV dynamic fields, documents, events, status transitions. The `Item` model has no `locationId` FK — locations are entirely absent from the data model.
- **`LOCATION_RELATION` field type**: Already defined in `DynamicFieldType` enum (`packages/database/prisma/schema.prisma:180`) but renders as `DeferredFieldInput` placeholder in the field registry (`apps/web/src/components/forms/field-registry.ts:44`). No Location model exists to resolve against.
- **ROADMAP.md discrepancy**: The ROADMAP defines Phase 6 = Ubicaciones (Locations) and Phase 7 = Planos (Floor Plans) as separate phases. The user's request combines both into "Phase 7 — Locations". This exploration treats them as a unified phase.
- **React Konva**: Listed in ROADMAP tech stack (`packages/database/prisma/schema.prisma` header comment references it) but **NOT installed** — not present in any `package.json`. Must be added as a dependency.
- **Storage**: Documents use a `StorageDriver` abstraction (`apps/web/src/lib/services/` — documented in Phase 5 session summary). Floor plan images should reuse this pattern.

### Key Patterns to Follow

| Pattern | Source | Relevance |
|---------|--------|-----------|
| Service/Repository separation | `item-service.ts` / `item-repository.ts` | Location CRUD must follow same architecture |
| Project-scoped access | `requireProjectMember` / `requireProjectOwner` | Locations are project-scoped |
| Zod validation in `packages/validation` | `item.ts`, `dynamic-field.ts` | Location schemas belong here |
| API routes under `/api/projects/[projectId]/` | `apps/web/src/app/api/projects/[projectId]/items/` | Location routes follow same nesting |
| EAV for dynamic data | `ItemFieldValue` model | Location metadata could use EAV, but hierarchy is structural → dedicated model |
| TanStack Query hooks | `use-items.ts` | Location hooks follow same pattern |
| shadcn/ui components | Radix primitives in `apps/web` | Tree UI, dialogs, etc. |

---

## Affected Areas

### New Files (Location Domain)

- `packages/database/prisma/schema.prisma` — Add `Location` model, `FloorPlan` model, `LocationMarker` model; add `locationId` FK to `Item`
- `packages/validation/src/location.ts` — Zod schemas for Location CRUD
- `apps/web/src/lib/repositories/location-repository.ts` — Data access layer
- `apps/web/src/lib/services/location-service.ts` — Business logic
- `apps/web/src/app/api/projects/[projectId]/locations/route.ts` — List/create locations
- `apps/web/src/app/api/projects/[projectId]/locations/[locationId]/route.ts` — Get/update/delete
- `apps/web/src/app/api/projects/[projectId]/locations/tree/route.ts` — Full hierarchy
- `apps/web/src/app/api/projects/[projectId]/floor-plans/route.ts` — Floor plan upload/list
- `apps/web/src/app/api/projects/[projectId]/floor-plans/[planId]/route.ts` — Plan CRUD
- `apps/web/src/app/api/projects/[projectId]/floor-plans/[planId]/markers/route.ts` — Marker CRUD
- `apps/web/src/components/locations/location-tree.tsx` — Hierarchical tree UI
- `apps/web/src/components/locations/location-picker.tsx` — Dropdown/tree picker for item assignment
- `apps/web/src/components/floor-plans/floor-plan-viewer.tsx` — React Konva canvas
- `apps/web/src/components/floor-plans/floor-plan-marker.tsx` — Draggable marker component
- `apps/web/src/components/floor-plans/floor-plan-toolbar.tsx` — Zoom/pan/filter controls
- `apps/web/src/hooks/use-locations.ts` — TanStack Query hooks
- `apps/web/src/hooks/use-floor-plans.ts` — TanStack Query hooks

### Modified Files

- `packages/database/prisma/schema.prisma` — Location, FloorPlan, LocationMarker models; Item.locationId FK
- `packages/validation/src/index.ts` — Export location schemas
- `apps/web/src/lib/repositories/item-repository.ts` — Add `locationId` to `CreateItemData`, `UpdateItemData`, `ListItemsFilters`
- `apps/web/src/lib/services/item-service.ts` — Pass through `locationId` in create/update
- `apps/web/src/components/forms/field-registry.ts` — Replace `LOCATION_RELATION` placeholder with real LocationPicker
- `apps/web/src/components/forms/fields/location-field.tsx` — New field component for LOCATION_RELATION type
- `packages/validation/src/item.ts` — Add `locationId` to create/update schemas
- `apps/web/src/hooks/use-items.ts` — Include location in list/detail queries
- `apps/web/src/components/items/create-item-form.tsx` — Add location picker
- `apps/web/src/components/items/edit-item-form.tsx` — Add location picker

---

## Approaches

### 1. Adjacency List (self-referential FK)

Each Location has a `parentId` pointing to its parent. Simplest pattern in Prisma.

```prisma
model Location {
  id        String   @id @default(cuid())
  projectId String
  parentId  String?
  name      String
  slug      String
  type      LocationType  // CENTER, BUILDING, FLOOR, ROOM, ZONE
  order     Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent   Location? @relation("LocationHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children Location[] @relation("LocationHierarchy")
  items    Item[]
  floorPlans FloorPlan[]

  @@unique([projectId, slug])
  @@index([projectId, parentId])
  @@map("locations")
}
```

**Pros:**
- Simple Prisma schema, no raw SQL
- Easy INSERT/UPDATE/DELETE (single row)
- Natural tree navigation with `include: { children: true }`
- Soft-delete of parent doesn't orphan children (they become roots)
- Consistent with existing Prisma patterns in the project

**Cons:**
- Ancestor queries require recursive CTEs (Prisma doesn't support natively — need `prisma.$queryRaw`)
- Depth limit must be enforced in application code
- Fetching full subtree requires multiple queries or raw SQL

**Effort: Low**

### 2. Materialized Path (path string)

Each Location stores a denormalized path like `/center-1/building-a/floor-2/`.

```prisma
model Location {
  id        String   @id @default(cuid())
  projectId String
  parentId  String?
  path      String   // "/center-1/building-a/floor-2/"
  depth     Int      @default(0)
  name      String
  slug      String
  type      LocationType
  // ... same fields as above
}
```

**Pros:**
- Ancestor queries via simple `LIKE` or `startsWith`
- Subtree queries via `path.startsWith(parentPath)`
- Depth is trivially computed from path segments
- No recursive CTEs needed

**Cons:**
- Path must be maintained on every move (update all descendants)
- Path length can grow unwieldy with deep hierarchies
- Prisma doesn't have native path operators — still need `contains`/`startsWith`
- Moves are expensive: update path of entire subtree

**Effort: Medium**

### 3. Closure Table (separate table)

A dedicated `LocationClosure` table stores every ancestor-descendant pair.

```prisma
model LocationClosure {
  ancestorId   String
  descendantId String
  depth        Int

  ancestor   Location @relation(fields: [ancestorId], references: [id], onDelete: Cascade)
  descendant Location @relation(fields: [descendantId], references: [id], onDelete: Cascade)

  @@id([ancestorId, descendantId])
  @@map("location_closure")
}
```

**Pros:**
- O(1) ancestor/descendant queries
- Subtree queries are simple and fast
- Depth is stored, no calculation needed
- Move operations update only closure rows (not descendants)

**Cons:**
- Separate closure table with N×N rows in worst case
- Insert/delete requires maintaining closure pairs (complex application logic)
- Prisma doesn't generate this — must manage manually
- Significant added complexity for a hierarchy that's typically 3-5 levels deep
- Harder to reason about, debug, and test

**Effort: High**

---

### Floor Plan Storage Approaches

#### A. Local Storage via StorageDriver (Recommended)

Reuse the existing `StorageDriver` abstraction from Phase 5 (Document Management). Floor plan images go through the same upload pipeline.

- Pros: Consistent with existing architecture, no new infrastructure
- Cons: Same storage limitations as documents (local disk in dev, S3 in prod)
- Effort: Low

#### B. Dedicated Image CDN / External Storage

Separate storage for floor plans (e.g., Cloudflare R2, dedicated S3 bucket).

- Pros: Better performance for large images, CDN caching
- Cons: New infrastructure, different config per environment
- Effort: Medium

#### C. Base64 in Database

Store floor plan images as base64 in a JSON column.

- Pros: No external storage dependency
- Cons: Terrible performance, massive DB bloat, no caching
- Effort: Low (but wrong)

---

### Floor Plan Viewer Approaches

#### A. React Konva (Recommended)

Canvas-based rendering with React Konva. Already in the tech stack plan.

- Pros: Hardware-accelerated rendering, smooth zoom/pan, drag-and-drop markers, layer support for filtering, battle-tested library
- Cons: Adds ~100KB to bundle, requires `"use client"`, canvas DOM not accessible to screen readers
- Effort: Medium

#### B. SVG-based (e.g., react-svg-pan-zoom)

SVG overlay on top of an `<img>` tag.

- Pros: Lighter weight, accessible DOM, no canvas dependency
- Cons: Poor performance with many markers, no hardware acceleration, limited layer support
- Effort: Low

#### C. Leaflet with Image Overlay

Use Leaflet's image overlay to treat the floor plan like a map tile.

- Pros: Zoom/pan built-in, marker clustering, well-known API
- Cons: Overkill for static images, confusing API for non-geo use cases, heavier bundle
- Effort: Medium

---

## Recommendation

### Hierarchy: **Adjacency List** (Approach 1)

**Rationale**: ManteMap's hierarchy is shallow (3-5 levels max: Center → Building → Floor → Room → Zone). Adjacency list is the simplest Prisma-compatible pattern. Recursive CTEs are only needed for "get full path" or "get ancestors" — infrequent operations that can use `$queryRaw` when needed. The project already follows Prisma-native patterns everywhere. Closure table is overkill for this depth.

### Floor Plan Storage: **StorageDriver reuse** (Approach A)

**Rationale**: The StorageDriver abstraction from Phase 5 already handles local/S3. Floor plans are binary assets like documents — same pipeline, same config.

### Floor Plan Viewer: **React Konva** (Approach A)

**Rationale**: React Konva provides hardware-accelerated canvas rendering with React integration. Zoom, pan, and drag-and-drop markers are first-class features. Layer support enables the "filter by type/status" requirement. The bundle size (~100KB) is acceptable for an MVP feature that's core to the product.

### Architecture Slices

Split into 3-4 deliverable slices to stay within the 400-line review budget:

1. **Location Model + CRUD** — Prisma schema, repository, service, API routes, validation, tests
2. **Location UI** — Tree component, picker, location assignment to items, tests
3. **Floor Plan Model + Upload** — FloorPlan/LocationMarker models, upload, API routes, tests
4. **Floor Plan Viewer** — React Konva integration, markers, zoom/pan, filters, tests

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Prisma baseline prerequisite** | Schema changes require the documented production baseline procedure (ADR-005) before deployment | Document as a hard prerequisite; dev can proceed with `prisma db push` locally |
| **React Konva bundle size** | ~100KB added to client bundle | Lazy-load the floor plan viewer component (`dynamic(() => import(...), { ssr: false })`) |
| **Recursive CTEs for deep queries** | Prisma doesn't support recursive CTEs natively | Use `$queryRaw` for ancestor/path queries; keep hierarchy shallow (max 5 levels enforced in service) |
| **Floor plan image size** | Large architectural drawings can be 10MB+ | Validate max upload size, compress server-side, serve with appropriate cache headers |
| **Marker coordinate system** | Normalized coordinates (0-1) vs pixel coordinates | Use normalized coordinates (0-1 range) for portability across zoom levels and image sizes |
| **LOCATION_RELATION field type** | Already in DynamicFieldType but deferred | This phase activates it — must update field-registry and create LocationPicker component |
| **Cross-phase dependencies** | Phase 7 depends on Phase 3 (Items) being complete | Phase 3 is complete ✅ — no blocker |
| **Windows build symlink issue** | Known standalone build EPERM on Windows | Existing known issue; not introduced by this phase |

---

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should:

1. Note the ROADMAP numbering discrepancy (ROADMAP says Phase 6=Locations, Phase 7=Plans; user wants Phase 7=combined). Propose updating ROADMAP or clarifying numbering.
2. Proceed to `sdd-propose` with the recommended approach: Adjacency List + StorageDriver + React Konva, split into 3-4 slices.
3. Highlight that the Prisma production baseline (ADR-005) remains a deployment blocker — local development can proceed freely.
