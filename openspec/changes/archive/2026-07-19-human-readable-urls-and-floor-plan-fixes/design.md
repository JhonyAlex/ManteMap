# Design: Human-Readable URLs + Breadcrumbs + Floor Plan Fixes

## Technical Approach

Three independent slices delivered sequentially. Slice 1 fixes floor plan bugs (missing view page, broken images, wrong navigation). Slice 2 resolves entity names in breadcrumbs. Slice 3 migrates project routes from CUID to `project.code`. No DB changes required — `code` is already `@unique`.

## Architecture Decisions

| # | Decision | Options Considered | Rationale |
|---|---|---|---|
| D1 | API image endpoint mirrors document download pattern | 1. Serve from `public/` (rejected — floor plans stored in private StorageDriver)\n2. Proxy via Next.js API route\n3. Direct filesystem `readFile` + stream | Chose #3: same pattern already proven in `documents/[documentId]/download/route.ts`. Auth guard + storage read + MIME detection + stream response. No new abstraction needed. |
| D2 | API routes accept BOTH code and CUID | 1. Only accept CUID (breaks Slice 3 pages)\n2. Only accept code (breaks bookmarks)\n3. Dual resolution: try code first, fall back to CUID | Chose #3: `findProjectByCode(param)` → if null, `findProjectById(param)`. Zero migration friction for bookmarks. API route folder name stays `[projectId]` — param interpretation changes at handler level only. |
| D3 | Page routes use `[projectCode]`, API routes keep `[projectId]` folders | 1. Rename both (massive diff, ~42 API route files)\n2. Only rename page routes | Chose #2: API folder name is cosmetic — routes resolve by filesystem, not folder name. Handler resolves param to CUID internally. 18 page files + 1 layout vs. 42 API files. |
| D4 | Breadcrumbs resolution: entity maps passed as props, fetched per-layout | 1. Context-based resolution (component tree doesn't allow — Breadcrumbs rendered outside ProjectLayout in dashboard layout)\n2. All-in-one fetch in dashboard layout (heavy for multi-project users)\n3. Dashboard layout renders breadcrumbs for `/dashboard` only; project layout renders its own with full entity maps | Chose #3: clean separation. Dashboard layout breadcrumbs only for root `/dashboard`. Project layout fetches entity names (floor plans, items, item types, locations, events) for the current project and renders `<Breadcrumbs>` with full resolution. |
| D5 | Redirect route: `[projectId]/page.tsx` uses `permanentRedirect()` | 1. `redirect()` (307 — wrong semantics)\n2. `permanentRedirect()` (308)\n3. `NextResponse.redirect()` with 301 | Chose #2: `permanentRedirect()` from `next/navigation` is the canonical Next.js way for permanent server-side redirects. Resolves CUID→code via `findProjectById()`, then `permanentRedirect()` to `/projects/${code}/...`. |

## Data Flow

### Slice 1 — Floor Plan Image Serving

```
Browser ──GET /api/projects/{id}/floor-plans/{planId}/image──→ API Route
  │
  ├─ getAuthUser() ──→ 401 if unauthenticated
  ├─ requireProjectMember(projectId, userId) ──→ 404 if not member
  ├─ findFloorPlanById(floorPlanId) ──→ 404 if missing
  ├─ StorageDriver.readFile(floorPlan.imageUrl) ──→ Buffer
  ├─ MIME from extension: .png→image/png, .jpg→image/jpeg, .svg→image/svg+xml
  └─ new NextResponse(buffer, { Content-Type, Content-Length }) ──→ Browser
```

### Slice 2 — Breadcrumbs Name Resolution

```
Dashboard layout (Server)
  └─ pathname === "/dashboard"? → <Breadcrumbs projectNames={...} />
     pathname matches project route? → no breadcrumbs here

Project layout [projectCode]/layout.tsx (Server)
  ├─ getProjectByCode(code, userId) → { id, code, name }
  ├─ fetchFloorPlanNames(projectId) → Record<CUID, name>
  ├─ fetchItemNames(projectId) → Record<CUID, name>
  ├─ fetchItemTypeNames(projectId) → Record<CUID, name>
  └─ Render: <Breadcrumbs entityMaps={{ projectNames, floorPlanNames, ... }} />
```

### Slice 3 — Route Resolution Flow

```
Browser → /projects/MAP-001/floor-plans/clxabc → Next.js
  │
  ├─ Match: (dashboard)/projects/[projectCode]/floor-plans/[floorPlanId]/
  │   params: { projectCode: "MAP-001", floorPlanId: "clxabc" }
  │   │
  │   ├─ Server: getProjectByCode("MAP-001", userId) → { id: "clx789", code: "MAP-001" }
  │   └─ Page uses project.id ("clx789") for API calls
  │
  ├─ Legacy path /projects/clx789/... → 301 permanentRedirect
  │   (resolved by [projectId]/page.tsx redirect route)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/projects/[projectId]/floor-plans/[floorPlanId]/image/route.ts` | **Create** | Image serving endpoint: auth guard → StorageDriver.readFile → stream with MIME type |
| `src/app/(dashboard)/projects/[projectCode]/floor-plans/[floorPlanId]/page.tsx` | **Create** | Server Component: resolves code→id, fetches plan + markers, renders FloorPlanViewer |
| `src/app/(dashboard)/projects/[projectId]/floor-plans/page.tsx` | **Modify** | Fix `<img src>` to use API endpoint; change `<a>` to `<Link>` with `projectCode` |
| `src/components/floor-plans/floor-plan-viewer.tsx` | **No change** | Already accepts `imageUrl` as string prop — caller changes what URL is passed |
| `src/lib/services/floor-plan-service.ts` | **Modify** | Add `getFloorPlanImage(projectId, planId, userId)` returning `{ buffer, mimeType }` |
| `src/app/(dashboard)/projects/[projectId]/` → `[projectCode]/` | **Rename** | 18 page files + 1 layout: `[projectId]` → `[projectCode]` in directory names |
| `src/app/(dashboard)/projects/[projectId]/page.tsx` | **Create** | Redirect route: resolves CUID→code, calls `permanentRedirect()` |
| `src/app/(dashboard)/projects/[projectCode]/layout.tsx` | **Modify** | Resolve code→id via `getProjectByCode()`; fetch entity name maps; render `<Breadcrumbs>` |
| `src/components/layout/breadcrumbs.tsx` | **Modify** | Extend props to `entityMaps: { projectNames?, floorPlanNames?, itemNames?, itemTypeNames?, locationNames?, eventNames? }`; resolve segments against appropriate maps |
| `src/app/(dashboard)/layout.tsx` | **Modify** | Conditional breadcrumbs: only render header breadcrumbs for non-project routes; keep `projectNames` for `/dashboard` |
| `src/components/layout/sidebar.tsx` | **Modify** | Replace `project.id` → `project.code` in all `<Link href>` and `isActiveProject()` check |
| `src/lib/services/project-service.ts` | **Modify** | Add `getProjectByCode(projectCode, userId)` with membership guard |
| `src/app/api/projects/[projectId]/...` (all handlers) | **Modify** | Add dual resolution: `resolveProjectId(param)` → try code, fall back to CUID |

## Interfaces / Contracts

### New: `GET /api/projects/{projectId}/floor-plans/{floorPlanId}/image`

```
Response 200: binary image data
  Headers: Content-Type: image/{png|jpeg|svg+xml}
           Content-Length: {byteLength}
Response 401: { error: "AUTHENTICATION_ERROR", message: "..." }
Response 404: { error: "NOT_FOUND", message: "Floor plan not found" | "Image file not found" }
```

### Extended: `BreadcrumbsProps`

```typescript
interface BreadcrumbsProps {
  /** Map of project ID/code → project name */
  projectNames?: Record<string, string>;
  /** Map of floor plan ID → floor plan name */
  floorPlanNames?: Record<string, string>;
  /** Map of item ID → item name */
  itemNames?: Record<string, string>;
  /** Map of item type ID → item type name */
  itemTypeNames?: Record<string, string>;
  /** Map of location ID → location name */
  locationNames?: Record<string, string>;
  /** Map of event ID → event name */
  eventNames?: Record<string, string>;
}
```

### New: `getProjectByCode`

```typescript
async function getProjectByCode(
  projectCode: string,
  userId: string
): Promise<{ project: { id: string; code: string; name: string; ... } }>
```

### New: `resolveProjectId` (API helper)

```typescript
// In API handlers — resolves param to actual CUID
async function resolveProjectId(param: string): Promise<string> {
  const byCode = await findProjectByCode(param);
  if (byCode) return byCode.id;
  const byId = await findProjectById(param);
  if (byId) return byId.id;
  throw new NotFoundError('Project', param);
}
```

## Route Structure Before/After

```
BEFORE:                                     AFTER:
projects/[projectId]/                       projects/[projectCode]/        ← renamed
projects/[projectId]/page.tsx               projects/[projectCode]/page.tsx
projects/[projectId]/dashboard/              projects/[projectCode]/dashboard/
projects/[projectId]/items/                  projects/[projectCode]/items/
projects/[projectId]/floor-plans/            projects/[projectCode]/floor-plans/
... (none)                                   projects/[projectCode]/floor-plans/[floorPlanId]/   ← new
projects/[projectId]/                        projects/[projectId]/page.tsx ← new: redirect to [projectCode]

API (unchanged directory names):
api/projects/[projectId]/...                api/projects/[projectId]/...  ← same folders
                                            (handlers resolve param via resolveProjectId())
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `resolveProjectId()` dual resolution | Vitest: mock `findProjectByCode`/`findProjectById`; test CUID-only, code-only, not-found |
| Unit | `pathToBreadcrumbs()` with extended entity maps | Vitest: test segment resolution for each entity type; test fallback to raw segment |
| Integration | Image endpoint: auth, 404, MIME detection | MSW + Vitest: mock StorageDriver; assert Content-Type for PNG/JPG/SVG |
| Integration | `[projectId]` → `[projectCode]` redirect | Vitest: call redirect page with CUID, assert permanentRedirect target |
| Component | Floor plan view page renders Viewer with markers | Vitest + Testing Library: mock services, assert FloorPlanViewer receives correct props |
| Component | Sidebar links use `project.code` | Vitest: render Sidebar with project list, assert href contains code not id |
| E2E | Full flow: list → view → image load | Playwright: navigate floor plans list, click View, verify Konva canvas renders |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changed. All changes are URL-path and component-rendering modifications within existing auth boundaries.

## Migration / Rollout

- **No data migration required** — `project.code` already exists as `@unique`.
- **Backward compatibility**: `[projectId]` redirect route preserves all existing bookmarks (301).
- **Rollback Slice 3**: revert directory renames, restore `[projectId]` folder names. Redirect route can remain.
- **Rollback Slice 1-2**: delete new files, restore previous breadcrumb props interface.

## Open Questions

- [ ] Should the API helper `resolveProjectId()` be applied to ALL API routes (42 files) or only to the image endpoint initially? Scope could be limited to image endpoint for Slice 1 and expanded in Slice 3.
- [ ] Should breadcrumb entity name fetching in project layout use a single batched query or per-entity-type queries? Batched is preferred for performance but may over-fetch for rarely-used breadcrumb types.
