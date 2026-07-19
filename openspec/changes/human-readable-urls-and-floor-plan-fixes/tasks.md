# Tasks: Human-Readable URLs + Breadcrumbs + Floor Plan Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~520 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Floor Plan Fixes) → PR 2 (Breadcrumbs) → PR 3 (Route Normalization) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Fix floor plan 404 + broken images + View link | PR 1 | `pnpm vitest run -- floor-plan` | Navigate floor plan list, click View, verify Konva canvas renders | revert new files: api route, view page, service method |
| 2 | Breadcrumbs resolve names for all entity types | PR 2 | `pnpm vitest run -- breadcrumbs` | Navigate project pages, verify crumb labels show names not CUIDs | revert breadcrumbs.tsx + layout changes |
| 3 | Project routes use `code`, backward-compat redirect | PR 3 | `pnpm vitest run -- redirect resolve-project-id` | Visit `/projects/CODE`, verify URL stays code-based + breadcrumbs resolve | revert directory renames + redirect route |

## Phase 1: Floor Plan Bug Fixes (Slice 1)

- [x] 1.1 Add `getFloorPlanImage(projectId, planId, userId)` to floor-plan-service.ts — StorageDriver.readFile → buffer + MIME detection by extension
- [x] 1.2 Create `api/projects/[projectId]/floor-plans/[floorPlanId]/image/route.ts` — auth guard → service call → `new NextResponse(buffer, { Content-Type })` (mirrors document download pattern)
- [x] 1.3 Create `floor-plans/[floorPlanId]/page.tsx` — Server Component fetches plan + markers server-side, renders `<FloorPlanViewer>` with API endpoint URL as `imageUrl`
- [x] 1.4 Modify floor-plans list page: swap `<img src={plan.imageUrl}>` → `/api/projects/.../image`; swap `<a>` → `<Link>` for View
- [x] 1.5 Tests: integration (image endpoint auth/404/MIME), component (view page renders with markers), e2e (list→view→canvas)

## Phase 2: Breadcrumbs Name Resolution (Slice 2)

- [ ] 2.1 Extend `BreadcrumbsProps` with optional `entityMaps` for floorPlans, items, itemTypes, locations, events; update `pathToBreadcrumbs()` to resolve segments against type-appropriate map
- [ ] 2.2 Fetch entity name maps (floorPlanNames, itemNames, itemTypeNames, locationNames, eventNames) in `[projectCode]/layout.tsx`; pass to `<Breadcrumbs entityMaps={...}>`
- [ ] 2.3 Modify `(dashboard)/layout.tsx`: render breadcrumbs only for non-project routes (split from project layout)
- [ ] 2.4 Tests: unit (pathToBreadcrumbs with all entity maps, unknown segment fallback), component (crumbs render names not IDs)

## Phase 3: Project Route Normalization (Slice 3)

- [ ] 3.1 Add `getProjectByCode(projectCode, userId)` to project-service.ts with membership guard
- [ ] 3.2 Create `[projectId]/page.tsx` redirect route: resolves CUID→code via `findProjectById()`, calls `permanentRedirect()` to `/projects/{code}/...`
- [ ] 3.3 Rename all 18 page directories `[projectId]` → `[projectCode]`; update `[projectCode]/layout.tsx` to use `getProjectByCode` for resolution
- [ ] 3.4 Update sidebar.tsx: replace `project.id` → `project.code` in all `<Link href>` and `isActiveProject()` check
- [ ] 3.5 Add `resolveProjectId(param)` helper: try `findProjectByCode` first, fall back to `findProjectById`, throw NotFoundError if neither matches
- [ ] 3.6 Update all API route handlers (42 files) to use `resolveProjectId(param)` instead of raw param
- [ ] 3.7 Tests: unit (resolveProjectId dual resolution, redirect route), component (sidebar hrefs use code not CUID), integration (301 redirect)
