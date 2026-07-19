# Proposal: Human-Readable URLs + Breadcrumbs + Floor Plan Fixes

## Intent

Users see raw CUIDs in URLs (`/projects/clx.../floor-plans/clx...`) and breadcrumbs, making navigation opaque and unsharable. Floor plan images don't display (stored outside `public/`) and the "View" link returns 404. Three related UX issues fixed together.

## Scope

### In Scope
- **Slice 1**: Fix floor plan View 404 → create `[floorPlanId]/page.tsx` + image serving API endpoint
- **Slice 2**: Breadcrumbs show resolved entity names instead of raw CUIDs
- **Slice 3**: Project routes use `project.code` instead of `project.id` (major UX, no DB migration needed)

### Out of Scope
- Slug migration for Location, FloorPlan, Event, Document (no slug columns exist)
- Item-level or item-type-level route normalization (deferred)
- Altering API route structure (REST endpoints keep `[projectId]`)
- SEO metadata overhaul
- Breadcrumb JSON-LD structured data

## Approach

**Phased delivery in 3 independent slices:**

| Slice | Deliverable | Files | Risk |
|-------|-------------|-------|------|
| 1 | Floor plan bug fixes | ~5–7 files | Low |
| 2 | Breadcrumbs name resolution | ~2–3 files | Low |
| 3 | Project route `code` migration | ~20–30 files | Medium |

### Slice 1 — Floor Plan Bug Fixes (must-fix)
- **View page**: Create `floor-plans/[floorPlanId]/page.tsx` — server component fetching plan + markers, rendering `FloorPlanViewer`
- **Image serving**: Add `GET /api/projects/{projectId}/floor-plans/{floorPlanId}/image` — reads from `StorageDriver`, sets `Content-Type`, streams response (same pattern as document download at `GET /api/.../documents/[id]/download`)
- **Link fix**: Change `<a href={...}>` to `<Link href={...}>` on floor-plans list page

### Slice 2 — Breadcrumbs Name Resolution
- Extend `projectNames` map pattern to include `itemTypeNames`, `itemNames`, `floorPlanNames`, etc.
- Fetch entity names server-side in `(dashboard)/layout.tsx` or via per-layout data fetching
- `pathToBreadcrumbs` already supports name lookup — just feed it richer maps

### Slice 3 — Project Route Normalization
- Rename `[projectId]` → `[projectCode]` in all page routes
- Update link generation in Sidebar, ItemList, FloorPlans page, and all navigation
- Project `code` is already `@unique` — no migration needed
- Add redirect: `[projectId]` → `[projectCode]` for backward compatibility (existing bookmarks)

## Capabilities

### New Capabilities
- `floor-plan-view`: Individual floor plan page with interactive viewer

### Modified Capabilities
- `floor-plan-management`: Add image serving endpoint; fix View link routing
- `floor-plan-viewer`: Image loading from API endpoint instead of direct storage path
- `application-shell`: Breadcrumbs resolve all entity names; project routes use `code`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(dashboard)/projects/[projectId]/floor-plans/` | Modified + New | New `[floorPlanId]/page.tsx`; fix View link |
| `src/app/api/projects/[projectId]/floor-plans/` | New | Image serving endpoint |
| `src/components/layout/breadcrumbs.tsx` | Modified | Extended name resolution |
| `src/app/(dashboard)/layout.tsx` | Modified | Fetch entity name maps |
| `src/app/(dashboard)/projects/[projectId]/` | Renamed | `[projectId]` → `[projectCode]` (all pages) |
| `src/components/layout/sidebar.tsx` | Modified | Use `project.code` in links |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken bookmarks after route rename | High | Add `[projectId]` redirect route that resolves CUID→code and 301s |
| Server-component data fetching for floor plan view | Low | `FloorPlanViewer` already client; view page fetches plan data server-side, pass as props |
| Breadcrumb data fetching overhead | Low | Fetch once per layout, not per page; map lookups are O(1) |
| StorageDriver file access in API route | Low | Same pattern already working for document download |

## Rollback Plan

- **Slice 3**: Revert route rename, restore `[projectId]` segments. Redirect route can remain to avoid broken links.
- **Slice 1-2**: Revert individual new files. No data migration involved.

## Dependencies

- None. All slices are independent of each other and require no DB changes.

## Success Criteria

- [ ] Floor plan "View" link navigates to working viewer page
- [ ] Floor plan images render on list page and viewer
- [ ] Breadcrumbs show human-readable names across all entity types
- [ ] Project URLs use `code` (e.g., `/projects/MAP-001` instead of `/projects/clxabc...`)
- [ ] Old CUID-based project URLs redirect (301) to new code-based URLs
- [ ] All existing tests pass; new tests cover View page, image endpoint, redirect
