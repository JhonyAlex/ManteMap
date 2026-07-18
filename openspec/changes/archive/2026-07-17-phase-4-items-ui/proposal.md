# Proposal: Phase 4 — Items UI

## Intent

Phase 3 delivered a complete Items CRUD API (list, detail, create, update, delete, status transitions). Phase 4 adds the frontend UI layer so users can manage items through the browser — the core value proposition of ManteMap.

## Scope

### In Scope
- TanStack Query `QueryClientProvider` setup
- shadcn/ui additions: Table, Dialog, Badge, DropdownMenu
- TanStack Query hooks for items (list, detail, create, update, delete, status transition)
- Items list page with dynamic columns from `showInList` fields, filters, pagination
- Item detail page with field value rendering by type, status badge, edit/delete actions
- Create/edit form page wrapping `DynamicForm` with field value submission
- Status transition dropdown on detail page with error handling
- Sidebar "Items" navigation entry per project

### Out of Scope
- Mobile-responsive card layout (future refinement)
- Bulk operations (multi-select, batch delete)
- File/image upload for FILE/IMAGE fields (deferred types)
- Item relations (ITEM_RELATION, LOCATION_RELATION, USER_RELATION)
- Export/import functionality
- Advanced filtering (date ranges, multi-status)

## Capabilities

### New Capabilities
- `items-ui`: Full frontend CRUD for items — list with dynamic columns, detail view, create/edit forms, status transitions. Covers pages, components, hooks, and QueryClient wiring.

### Modified Capabilities
- `item-management`: Add UI-facing requirements — list page SHALL derive columns from `showInList` DynamicFields; detail page SHALL render field values by type; create/edit SHALL wrap DynamicForm with field value transformation.
- `configurable-statuses`: Add UI requirement — status transitions SHALL render as a DropdownMenu on the detail page; final status SHALL disable transition actions; errors (409, 404) SHALL display as toast notifications.

## Approach

**Table-based list + Server Component shell hybrid.** List page as Server Component fetching initial data. Interactive parts (filters, pagination, status transitions) as Client Components with TanStack Query. Dynamic columns derived from `showInList` fields per ItemType.

5-slice breakdown:
1. **Foundation** — QueryClientProvider, shadcn/ui components (Table, Dialog, Badge, DropdownMenu), hooks barrel
2. **Items List** — Table with dynamic columns, ItemType selector, search, pagination
3. **Item Detail** — Detail view with field values, status badge, edit/delete actions
4. **Create/Edit** — Form page wrapping DynamicForm with fieldValues transformation
5. **Status Transitions** — Transition dropdown, isFinal validation, toast notifications

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/components/providers.tsx` | Modified | Add QueryClientProvider |
| `apps/web/src/components/layout/sidebar.tsx` | Modified | Add "Items" nav entry |
| `packages/ui/src/components/` | New | Table, Dialog, Badge, DropdownMenu |
| `apps/web/src/hooks/use-items.ts` | New | TanStack Query hooks |
| `apps/web/src/components/items/` | New | ItemList, ItemDetail, ItemForm, StatusTransition |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/` | New | List + detail pages |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dynamic column rendering complexity | Medium | Type-safe column builder, focused tests |
| Status transition error UX | Medium | Toast notifications with clear messages |
| TanStack Query wiring gaps | Low | Foundation slice handles setup first |

## Rollback Plan

Each slice is independently revertable via `git revert`. Removing QueryClientProvider breaks client data fetching only — server-rendered pages still work. Removing new pages/components has zero impact on existing functionality.

## Dependencies

- Phase 3 Items API (complete)
- Phase 2 DynamicForm component (complete)
- shadcn/ui CLI for component installation

## Success Criteria

- [ ] Users can list items per ItemType with dynamic columns
- [ ] Users can view item detail with all field values rendered
- [ ] Users can create and edit items via DynamicForm
- [ ] Users can transition item statuses with error feedback
- [ ] All new components have unit tests
- [ ] Lint, typecheck, and build pass
