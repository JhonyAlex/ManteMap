# Design: Phase 7 — Locations

## Technical Approach

Implement hierarchical locations using Prisma adjacency-list pattern (self-referential `parentId`), floor plan management reusing `StorageDriver` from Phase 5, and React Konva viewer with normalized coordinates. Activate `LOCATION_RELATION` field type by replacing `DeferredFieldInput` with `LocationPicker` in field registry.

## Architecture Decisions

### Decision: Location Hierarchy Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Adjacency List (`parentId` FK) | Simple queries, recursive reads | ✅ Selected |
| Materialized Path (`path` column) | Fast reads, complex writes | Rejected |
| Nested Sets (`lft`/`rgt`) | Fast reads, expensive mutations | Rejected |

**Rationale**: Adjacency list is the standard Prisma pattern. Max 5 levels avoids deep recursion. `$queryRaw` CTEs used sparingly for ancestor queries.

### Decision: Floor Plan Storage

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `StorageDriver` | Same pipeline as documents | ✅ Selected |
| Separate storage bucket | Isolation, different config | Rejected |

**Rationale**: Floor plans are binary assets like documents. Same validation, same upload flow, same config.

### Decision: Marker Coordinate System

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Normalized (0-1) | Resolution-independent | ✅ Selected |
| Pixel-based | Direct mapping, breaks on resize | Rejected |

**Rationale**: Normalized coordinates survive zoom, resize, and different image resolutions.

### Decision: React Konva Loading

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dynamic import (`ssr: false`) | Lazy load ~100KB bundle | ✅ Selected |
| Static import | Always loaded, larger initial bundle | Rejected |

**Rationale**: Floor plan viewer only needed on specific pages. Dynamic import avoids bloating main bundle.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOCATION CRUD                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser ──→ API Route ──→ location-service.ts                  │
│                               │                                 │
│                    ┌──────────┴──────────┐                      │
│                    ▼                     ▼                       │
│          location-repository.ts    project-access-service.ts    │
│                    │                                             │
│                    ▼                                             │
│               Prisma → PostgreSQL                                │
│          (Location, FloorPlan, LocationMarker)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FLOOR PLAN UPLOAD                          │
├─────────────────────────────────────────────────────────────────┤
│  Browser ──→ API Route ──→ floor-plan-service.ts                │
│                               │                                 │
│                    ┌──────────┴──────────┐                      │
│                    ▼                     ▼                       │
│            StorageDriver.writeFile   Prisma.floorPlan.create    │
│                    │                                             │
│                    ▼                                             │
│         {projectId}/floor-plans/{timestamp}-{filename}          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    REACT KONVA VIEWER                            │
├─────────────────────────────────────────────────────────────────┤
│  dynamic(() => import('./FloorPlanViewer'), { ssr: false })     │
│       │                                                         │
│       ▼                                                         │
│  Stage → Layer → Image (floor plan)                             │
│       → Layer → markers (draggable, normalized coords)          │
│       → Layer → filters (type/status)                           │
│       │                                                         │
│       ▼                                                         │
│  onClick marker → Item card popover                             │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Add Location, FloorPlan, LocationMarker models; Item.locationId FK |
| `packages/validation/src/location.ts` | Create | Zod schemas for Location CRUD |
| `packages/validation/src/floor-plan.ts` | Create | Zod schemas for FloorPlan upload |
| `apps/web/src/lib/repositories/location-repository.ts` | Create | Data access layer for locations |
| `apps/web/src/lib/repositories/floor-plan-repository.ts` | Create | Data access layer for floor plans |
| `apps/web/src/lib/services/location-service.ts` | Create | Business logic, depth enforcement |
| `apps/web/src/lib/services/floor-plan-service.ts` | Create | Upload via StorageDriver, marker CRUD |
| `apps/web/src/app/api/projects/[projectId]/locations/` | Create | CRUD + tree API routes |
| `apps/web/src/app/api/projects/[projectId]/floor-plans/` | Create | Upload, CRUD, marker API routes |
| `apps/web/src/components/locations/location-tree.tsx` | Create | Hierarchical location tree component |
| `apps/web/src/components/locations/location-picker.tsx` | Create | LocationPicker for forms |
| `apps/web/src/components/floor-plans/floor-plan-viewer.tsx` | Create | React Konva canvas viewer |
| `apps/web/src/components/floor-plans/marker-layer.tsx` | Create | Draggable marker layer |
| `apps/web/src/components/floor-plans/viewer-toolbar.tsx` | Create | Zoom/pan/filter controls |
| `apps/web/src/hooks/use-locations.ts` | Create | TanStack Query hooks |
| `apps/web/src/hooks/use-floor-plans.ts` | Create | TanStack Query hooks |
| `apps/web/src/components/forms/field-registry.ts` | Modify | LOCATION_RELATION → LocationPicker |
| `apps/web/src/lib/repositories/item-repository.ts` | Modify | Add locationId to CreateItemData |
| `apps/web/src/lib/services/item-service.ts` | Modify | Pass through locationId |

## Interfaces / Contracts

```typescript
// packages/database/prisma/schema.prisma — New models

model Location {
  id          String   @id @default(cuid())
  projectId   String
  parentId    String?
  name        String
  level       Int      // 0=Center, 1=Building, 2=Floor, 3=Room, 4=Zone
  order       Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent   Location? @relation("LocationHierarchy", fields: [parentId], references: [id])
  children Location[] @relation("LocationHierarchy")
  items    Item[]
  markers  LocationMarker[]

  @@index([projectId, parentId])
  @@index([projectId, level])
  @@map("locations")
}

model FloorPlan {
  id          String   @id @default(cuid())
  locationId  String
  name        String
  imageUrl    String   // StorageDriver path
  width       Int      // Original image width
  height      Int      // Original image height
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  location Location        @relation(fields: [locationId], references: [id], onDelete: Cascade)
  markers  LocationMarker[]

  @@index([locationId])
  @@map("floor_plans")
}

model LocationMarker {
  id          String   @id @default(cuid())
  floorPlanId String
  itemId      String?
  x           Float    // Normalized 0-1
  y           Float    // Normalized 0-1
  label       String?
  color       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  floorPlan FloorPlan @relation(fields: [floorPlanId], references: [id], onDelete: Cascade)
  item      Item?      @relation(fields: [itemId], references: [id], onDelete: SetNull)

  @@index([floorPlanId])
  @@index([itemId])
  @@map("location_markers")
}

// Item model — add locationId FK
model Item {
  // ... existing fields ...
  locationId String?
  location   Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)
  markers    LocationMarker[]
}
```

```typescript
// packages/validation/src/location.ts
export const createLocationSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().cuid().optional(),
  level: z.number().int().min(0).max(4),
  order: z.number().int().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});
```

```typescript
// apps/web/src/lib/services/location-service.ts — Depth enforcement
export async function validateLocationDepth(
  projectId: string,
  parentId: string | null,
  level: number,
  client: PrismaClient
): Promise<void> {
  if (level > 4) throw new ValidationError('Maximum location depth (5 levels) exceeded');
  if (parentId) {
    const parent = await client.location.findUnique({ where: { id: parentId } });
    if (!parent || parent.projectId !== projectId) {
      throw new NotFoundError('Parent location', parentId);
    }
    if (parent.level !== level - 1) {
      throw new ValidationError(`Parent must be level ${level - 1}, got ${parent.level}`);
    }
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Location depth validation, slug generation, coordinate normalization | Vitest |
| Unit | Zod schemas (location, floor-plan) | Vitest with valid/invalid inputs |
| Integration | Location CRUD with project scoping | Vitest + Prisma mock |
| Integration | Floor plan upload via StorageDriver | Vitest + mock StorageDriver |
| Integration | Marker CRUD with normalized coordinates | Vitest + Prisma mock |
| Component | LocationTree rendering, LocationPicker selection | React Testing Library |
| Component | FloorPlanViewer with markers | React Testing Library + mock canvas |
| E2E | Location hierarchy creation, floor plan upload, marker placement | Playwright |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

- **Schema**: New tables only (Location, FloorPlan, LocationMarker). Item.locationId FK added. No existing data modified.
- **Deployment**: Requires Prisma production baseline (ADR-005) first. Dev proceeds with `prisma db push`.
- **Rollback**: Drop new tables, remove Item.locationId FK, revert LOCATION_RELATION to DeferredField.

## Open Questions

- [ ] Should location hierarchy support drag-to-reorder across levels, or only within same parent?
- [ ] Max upload size for floor plans — reuse document limit (10MB) or different?
- [ ] Should markers support custom icons per item type, or use uniform markers?
