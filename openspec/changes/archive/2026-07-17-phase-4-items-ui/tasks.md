# Tasks: Phase 4 — Items UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation — QueryClient, utilities, hooks barrel | PR 1 | `pnpm test -- column-builder cell-renderer` | N/A — pure logic, no UI | `providers.tsx`, `hooks/`, `column-builder.ts`, `cell-renderer.tsx` |
| 2 | Items list + detail pages | PR 2 | `pnpm test -- item-list item-detail` | `pnpm dev` → navigate to `/projects/{id}/items` | `item-list.tsx`, `item-detail.tsx`, list/detail pages |
| 3 | CRUD forms + status transitions + sidebar | PR 3 | `pnpm test -- status-transition item-form` | `pnpm dev` → create item, transition status | `status-transition.tsx`, form pages, sidebar edit |

---

## Phase 1: Foundation (PR 1)

- [x] 1.1 **RED**: Write test for `column-builder.ts` — columns derived from `showInList` fields, ordered by `order`
- [x] 1.2 **GREEN**: Create `apps/web/src/components/items/column-builder.ts` — filter `showInList===true`, sort by `order`, map to `ItemColumn`
- [x] 1.3 **REFACTOR**: Extract `ItemColumn` interface to `packages/shared/src/types`
- [x] 1.4 **RED**: Write test for `cell-renderer.tsx` — SHORT_TEXT, NUMBER (locale format), BOOLEAN, DATE, STATUS rendering
- [x] 1.5 **GREEN**: Create `apps/web/src/components/items/cell-renderer.tsx` — type-to-component map with plain text fallback
- [x] 1.6 **GREEN**: Modify `apps/web/src/components/providers.tsx` — add `QueryClientProvider` wrapping `SessionProvider`, `staleTime: 30s`, `refetchOnWindowFocus: false`
- [x] 1.7 **GREEN**: Install shadcn/ui Table, Dialog, Badge, DropdownMenu via CLI
- [x] 1.8 **GREEN**: Create `apps/web/src/hooks/index.ts` — barrel export

## Phase 2: Items List + Detail (PR 2)

- [x] 2.1 **RED**: Write test for `useItems` hook — returns `{ data, isLoading, error }`, passes filters to API
- [x] 2.2 **GREEN**: Create `apps/web/src/hooks/use-items.ts` — `useItems`, `useItem` hooks with TanStack Query
- [x] 2.3 **RED**: Write test for `item-list.tsx` — renders dynamic columns, pagination controls, search input
- [x] 2.4 **GREEN**: Create `apps/web/src/components/items/item-list.tsx` — Client Component with Table, search, pagination
- [x] 2.5 **GREEN**: Create `apps/web/src/app/(dashboard)/projects/[projectId]/items/page.tsx` — Server Component shell, fetches itemTypes + initial items
- [x] 2.6 **RED**: Write test for `item-detail.tsx` — renders field values by type, status Badge with color, edit/delete buttons
- [x] 2.7 **GREEN**: Create `apps/web/src/components/items/item-detail.tsx` — field value renderer, status badge, action buttons
- [x] 2.8 **GREEN**: Create `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/page.tsx` — Server Component fetches item + fields

## Phase 3: CRUD + Status + Sidebar (PR 3)

- [x] 3.1 **RED**: Write test for value transformation — form values `{ [fieldId]: value }` ↔ EAV `[{ dynamicFieldId, value }]`
- [x] 3.2 **GREEN**: Create `apps/web/src/app/(dashboard)/projects/[projectId]/items/new/page.tsx` — wraps DynamicForm, transforms on submit
- [x] 3.3 **GREEN**: Create `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/edit/page.tsx` — pre-populates from EAV, transforms on submit
- [x] 3.4 **GREEN**: Add `useCreateItem`, `useUpdateItem`, `useDeleteItem` to `use-items.ts` (already existed from PR 2)
- [x] 3.5 **RED**: Write test for `status-transition.tsx` — shows available transitions, disabled when `isFinal`, toast on 409/404
- [x] 3.6 **GREEN**: Create `apps/web/src/components/items/status-transition.tsx` — DropdownMenu with color indicators, disabled state
- [x] 3.7 **GREEN**: Add `useTransitionStatus` to `use-items.ts` (already existed from PR 2)
- [x] 3.8 **GREEN**: Modify `apps/web/src/components/layout/sidebar.tsx` — add "Items" nav link under active project
- [x] 3.9 **VERIFY**: Run `pnpm lint && pnpm typecheck && pnpm test` — 58/58 tests passing
