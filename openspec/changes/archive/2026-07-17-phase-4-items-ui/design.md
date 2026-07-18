# Design: Phase 4 — Items UI

## Technical Approach

Server Component shell with Client Component interactivity. Pages follow the existing dashboard pattern: Server Component fetches initial data and resolves auth, Client Components handle user interactions via TanStack Query. DynamicForm (Phase 2) is reused for create/edit with field value transformation. Dynamic columns for the list page are derived from `showInList` fields on the ItemType's DynamicFields.

## Architecture Decisions

### Decision: TanStack Query for client-side data fetching

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Server-only (RSC + server actions) | No client cache, full reloads on mutations | Rejected — poor UX for status transitions and inline edits |
| TanStack Query | Adds dependency, QueryClient setup | **Chosen** — existing proposal dependency, stale-while-revalidate UX, optimistic updates possible later |

**Rationale**: The proposal explicitly requires TanStack Query. It integrates well with the existing Server Component shell — initial data can be passed as `initialData` to skip the first client fetch.

### Decision: Dynamic column builder from showInList fields

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Static column config per ItemType | Simple but requires config UI | Rejected — no column config UI in scope |
| Derive from `showInList` DynamicField flag | Automatic, zero config | **Chosen** — matches existing field metadata |

**Rationale**: DynamicFields already have `showInList: boolean`. The list table builder filters fields where `showInList === true`, sorts by `order`, and renders cell values using a type-to-cell renderer (mirrors field-registry pattern for display, not input).

### Decision: Status transition as DropdownMenu on detail page

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate status page/section | More space, but extra navigation | Rejected — overengineered for 1 action |
| DropdownMenu on detail header | Inline, fast access | **Chosen** — shadcn DropdownMenu matches existing UI patterns |

**Rationale**: Status transitions are a primary action on the detail page. DropdownMenu shows available transitions, disables when `isFinal`, and triggers toast on error (409 conflict, 404 not found).

## Data Flow

```
Browser ──→ items/page.tsx (Server Component)
              │ fetches itemTypes + initial items via service
              │
              └──→ ItemList (Client Component)
                    │ receives initialData + itemTypes
                    │ uses useItems() hook → TanStack Query
                    │ renders Table with dynamic columns
                    │
                    ├──→ [Create Item] → items/new/page.tsx
                    │      └──→ DynamicForm with field value transform
                    │
                    └──→ [Row Click] → items/[itemId]/page.tsx
                           │ Server Component fetches item + fields
                           │
                           └──→ ItemDetail (Client Component)
                                 ├── Field values rendered by type
                                 ├── StatusBadge + StatusTransition dropdown
                                 └── Edit/Delete actions
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/components/providers.tsx` | Modify | Add QueryClientProvider wrapping SessionProvider |
| `apps/web/src/hooks/use-items.ts` | Create | TanStack Query hooks: useItems, useItem, useCreateItem, useUpdateItem, useDeleteItem, useTransitionStatus |
| `apps/web/src/hooks/index.ts` | Create | Barrel export |
| `apps/web/src/components/items/item-list.tsx` | Create | Client Component — Table with dynamic columns, search, pagination |
| `apps/web/src/components/items/item-detail.tsx` | Create | Client Component — field value renderer, status badge, actions |
| `apps/web/src/components/items/status-transition.tsx` | Create | Client Component — DropdownMenu for status transitions |
| `apps/web/src/components/items/column-builder.ts` | Create | Utility — builds column config from showInList fields |
| `apps/web/src/components/items/cell-renderer.tsx` | Create | Renders field values by type (display, not input) |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/page.tsx` | Create | Server Component — items list page |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/page.tsx` | Create | Server Component — item detail page |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/new/page.tsx` | Create | Server Component + DynamicForm — create item |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/edit/page.tsx` | Create | Server Component + DynamicForm — edit item |
| `apps/web/src/components/layout/sidebar.tsx` | Modify | Add "Items" nav entry per project |

## Interfaces / Contracts

```typescript
// hooks/use-items.ts
interface UseItemsOptions {
  projectId: string;
  itemTypeId: string;
  statusId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Column builder output
interface ItemColumn {
  key: string;
  label: string;
  type: DynamicFieldType;
  order: number;
}

// Cell renderer props
interface CellRendererProps {
  type: DynamicFieldType;
  value: unknown;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | column-builder, cell-renderer, hooks | Vitest — column generation from fields, value formatting by type, hook return shapes with MSW |
| Integration | ItemList, ItemDetail, StatusTransition | Vitest + Testing Library — render with mock data, user interactions (click, search, paginate, transition) |
| E2E | Full CRUD flow | Playwright — create item, view detail, edit, transition status, delete |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Phase 3 Items API is already deployed. UI additions are purely additive — no existing functionality changes.

## Open Questions

- [ ] Should list page default to first ItemType or show a selector? (Proposal says selector — confirm UX)
- [ ] Pagination: client-side or server-side? API supports both — recommend server-side for scalability
