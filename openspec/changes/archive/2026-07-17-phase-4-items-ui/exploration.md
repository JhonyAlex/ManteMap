# Exploration: Phase 4 — Items UI

## Current State

Phase 3 delivered a complete Items CRUD backend:

- **API routes** under `/api/projects/[projectId]/items/`:
  - `GET /items` — list with `itemTypeId` (required), `statusId`, `search`, `page`, `pageSize` filters
  - `POST /items` — create with name, slug, itemTypeId, statusId, fieldValues
  - `GET /items/[itemId]` — detail with hydrated fieldValues (includes dynamicField definitions)
  - `PATCH /items/[itemId]` — partial update (name, statusId, fieldValues)
  - `DELETE /items/[itemId]` — cascade delete
  - `PATCH /items/[itemId]/status` — status transition (enforces isFinal)

- **DynamicForm** (Phase 2 Slice 4) renders forms from DynamicFieldDefinition arrays with Zod validation, field registry (13 active types), and FormFieldWrapper.

- **TanStack Query** is installed (`@tanstack/react-query ^5.60.0`) but **NOT wired up** — no `QueryClientProvider` exists.

- **shadcn/ui components** available: Button, Input, Textarea, Label, Checkbox, Switch, Select, Form. **Missing** for this phase: Table, Dialog, Badge, DropdownMenu.

- **No hooks directory** exists yet (`apps/web/src/hooks/` is empty).

- **No existing list/detail page patterns** — only a simple project info page at `projects/[projectId]/page.tsx`.

## Affected Areas

| Area | Impact | Why |
|------|--------|-----|
| `apps/web/src/components/providers.tsx` | Modified | Add `QueryClientProvider` wrapper |
| `apps/web/src/components/layout/sidebar.tsx` | Modified | Add "Items" nav entry per project |
| `packages/ui/src/components/table.tsx` | New | shadcn/ui Table component |
| `packages/ui/src/components/dialog.tsx` | New | shadcn/ui Dialog for confirmations |
| `packages/ui/src/components/badge.tsx` | New | shadcn/ui Badge for status display |
| `packages/ui/src/components/dropdown-menu.tsx` | New | shadcn/ui DropdownMenu for actions |
| `packages/ui/src/index.ts` | Modified | Export new components |
| `apps/web/src/hooks/use-items.ts` | New | TanStack Query hooks for items |
| `apps/web/src/hooks/index.ts` | New | Barrel exports |
| `apps/web/src/components/items/item-list.tsx` | New | Table with dynamic columns from showInList fields |
| `apps/web/src/components/items/item-card.tsx` | New | Card variant for mobile/responsive |
| `apps/web/src/components/items/item-detail.tsx` | New | Detail view with field values rendered by type |
| `apps/web/src/components/items/item-form.tsx` | New | Create/edit form wrapping DynamicForm |
| `apps/web/src/components/items/status-transition.tsx` | New | Status transition dropdown/buttons |
| `apps/web/src/components/items/index.ts` | New | Barrel exports |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/page.tsx` | New | Items list page (Server Component shell) |
| `apps/web/src/app/(dashboard)/projects/[projectId]/items/[itemId]/page.tsx` | New | Item detail page (Server Component shell) |

## Approaches

### 1. Table-based list with dynamic columns

List items in a shadcn/ui Table. Columns derived from `showInList` fields of the ItemType. Server-side pagination via query params. Filters in a toolbar above the table.

- Pros: Standard pattern for management UIs, scannable, handles large datasets, clean pagination
- Cons: Requires URL state management for filters/pagination, dynamic columns add rendering complexity
- Effort: Medium

### 2. Card-based grid list

Each item rendered as a card in a responsive grid. Simpler to implement, better mobile UX.

- Pros: Simpler, naturally responsive, shows more context per item
- Cons: Poor for large datasets, harder to scan/compare, no standard sorting
- Effort: Low

### 3. Hybrid table + card responsive

Table on desktop, card layout on mobile. Two rendering paths.

- Pros: Best UX across devices
- Cons: Most complex, two code paths to maintain, harder to test
- Effort: High

### 4. Server Component list + Client Component interactions

List page as Server Component fetching data directly. Only interactive parts (filters, pagination, status transitions) are Client Components. No TanStack Query for the list — use React cache/revalidate.

- Pros: Follows existing project pattern (Server Components by default), simpler initial setup
- Cons: Filter changes cause full page navigations (no SPA feel), harder to do optimistic updates, status transitions still need client mutations
- Effort: Low-Medium

## Recommendation

**Approach 1 (Table-based list) + Approach 4 hybrid.**

Rationale:
1. The API requires `itemTypeId` as mandatory — list is always scoped to an ItemType. This means columns are deterministic per type.
2. `showInList` fields already exist on DynamicFieldDefinition — the list columns ARE the showInList fields + name/slug/status.
3. Table is the standard pattern for asset management UIs (CMMS, EAM, etc.).
4. Use Server Components for the page shell and initial data fetch. Client Components for filters, pagination state, and status transitions.
5. Wire up TanStack Query for the interactive parts (filter changes, status transitions, optimistic updates).

**Slice breakdown:**
1. **Foundation** — QueryClientProvider, shadcn/ui additions (Table, Dialog, Badge, DropdownMenu), hooks barrel
2. **Items List** — Table with dynamic columns, ItemType selector, filters, pagination
3. **Item Detail** — Detail view with field values, status badge, edit/delete actions
4. **Create/Edit** — Form page wrapping DynamicForm with field values submission
5. **Status Transitions** — Transition dropdown on detail page, validation feedback

## Key Design Decisions

### Dynamic columns from showInList
The list page receives an `itemTypeId` (from URL or selector). It fetches the ItemType's DynamicFields, filters to `showInList: true`, and renders those as table columns alongside fixed columns (name, status, createdAt).

### Field value rendering in detail view
The detail API already returns fieldValues with nested dynamicField definitions. A `FieldValueDisplay` component maps each field type to a read-only renderer (text, formatted number, badge for SELECT, etc.).

### Status transition UX
Show current status as a Badge. If the current status is NOT final, show a DropdownMenu with available statuses. On selection, call `PATCH /items/[itemId]/status`. Handle 409 (isFinal block) and 404 (deactivated status) with toast notifications.

### Form submission flow
1. User navigates to create/edit page
2. Server Component fetches ItemType + DynamicFields
3. Client Component renders DynamicForm with field definitions
4. On submit: transform form data to `fieldValues: [{dynamicFieldId, value}]` format
5. Call POST (create) or PATCH (update) API
6. Redirect to detail page on success

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TanStack Query not wired up | Certain | Blocks all client-side data fetching | Add QueryClientProvider in foundation slice |
| Missing shadcn/ui components (Table, Dialog, Badge) | Certain | Blocks list/detail rendering | Add in foundation slice via shadcn CLI |
| Dynamic column rendering complexity | Medium | Harder to test, more edge cases | Type-safe column builder, focused tests |
| Status transition error handling | Medium | Poor UX on conflicts | Toast notifications with clear messages |
| Field value type coercion on display | Low | Wrong formatting | Render switch on field.type, type-safe formatters |
| Large item lists performance | Low | Slow rendering | Server-side pagination already in API |

## Ready for Proposal

**Yes.** The exploration is complete. The orchestrator should:

1. Confirm the table-based list approach with the user
2. Proceed to `sdd-propose` to define scope, approach, and rollback plan
3. Note that foundation slice must include: QueryClientProvider setup, shadcn/ui Table/Dialog/Badge/DropdownMenu installation, and hooks barrel
