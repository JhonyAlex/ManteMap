# Exploration: Phase 2 Slice 4 — Generated Forms from Field Definitions

## Current State

### What Exists Today

**Data Model (Slice 2)**: Full `DynamicField` model in Prisma with 18 types:
- `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `DECIMAL`, `CURRENCY`, `BOOLEAN`, `DATE`, `DATETIME`, `SELECT`, `MULTI_SELECT`, `URL`, `EMAIL`, `PHONE`, `FILE`, `IMAGE`, `ITEM_RELATION`, `LOCATION_RELATION`, `USER_RELATION`
- Each field has: `required`, `defaultValue` (JSON), `options` (JSON for SELECT/MULTI_SELECT), `unit`, `validation` (JSON with min/max/minLength/maxLength/pattern/minDate/maxDate/customMessage), `helpText`, `showInList`, `showInSearch`, `visible`

**Shared Types** (`packages/shared/src/types/domain.ts`):
- `DynamicFieldDefinition` interface — mirrors all Prisma fields
- `DynamicFieldType` union — 18 string literals
- `FieldOption` — `{ label, value, color? }`
- `FieldValidation` — `{ min?, max?, minLength?, maxLength?, pattern?, customMessage? }`

**Validation** (`packages/validation/src/dynamic-field.ts`):
- `createDynamicFieldSchema` / `updateDynamicFieldSchema` — Zod schemas for the API
- Per-type validation key mapping: NUMBER/DECIMAL/CURRENCY → `{min, max}`, SHORT/LONG_TEXT → `{minLength, maxLength, pattern}`, DATE/DATETIME → `{minDate, maxDate}`, SELECT/MULTI_SELECT → null (options-based)
- Types without validation (BOOLEAN, URL, EMAIL, PHONE, FILE, IMAGE, RELATIONS) reject validation rules
- NOTE: There is NO `createFieldValueSchema` factory yet — this is the missing piece that builds a Zod schema for form field VALUES from field definitions

**Forms today**: The project has NO React Hook Form usage at all. Login/register pages use bare `<input>` elements with `useState` and manual Zod validation (`schema.safeParse()`). No shadcn/ui form components exist.

**Available UI components** (`packages/ui/`):
- Only `Button` (with variants) — the foundation for shadcn/ui
- `cn()` utility for Tailwind class merging
- No Input, Select, Textarea, Checkbox, DatePicker, or Form components

**shadcn/ui configuration** (`apps/web/components.json`):
- Style: new-york, RSC: true, TSX: true
- UI alias points to `@mantemap/ui/components` — but no shadcn components are installed
- Base color: neutral, CSS variables: enabled
- The infrastructure (Tailwind tokens, CSS vars, `cn()`) exists — only the component files are missing

**Dependencies**:
- `react-hook-form: ^7.54.0` — installed ✅
- `@hookform/resolvers` — NOT installed ❌ (needed for `zodResolver`)
- `zod: ^3.23.0` — installed ✅
- `@radix-ui/react-slot: ^1.1.0` — installed ✅ (shadcn/ui foundation)
- No `@radix-ui/react-select`, `@radix-ui/react-checkbox`, etc. — NOT installed ❌ (needed for complex inputs)

### Architecture Patterns

- **Server Components by default** (ADR-001). Client Components only for interactivity.
- **Service → Repository → Prisma** layering. Components never access Prisma directly.
- **Forms are NOT patterns yet** — login/register pages are the only forms, both using manual state
- **Page structure**: `(dashboard)/` group layout fetches data server-side, passes to client components
- **Test patterns**: `describe`/`it` blocks with vitest, Zod `safeParse` assertions. Component tests use `@testing-library/react` with `render` + `screen` + `userEvent`

## Affected Areas

| Path | Why |
|------|-----|
| `packages/validation/src/dynamic-field.ts` | Must add `createFieldValueSchema(fields)` factory function — builds a Zod schema from DynamicFieldDefinition[] for form validation |
| `packages/validation/src/dynamic-field.test.ts` | Must add tests for the Zod schema factory output |
| `apps/web/package.json` | Must add `@hookform/resolvers` dependency |
| `apps/web/src/components/forms/` | NEW — DynamicForm component + field-type registry + per-type input components |
| `apps/web/src/lib/utils.ts` | Possibly re-export form utilities |
| `packages/ui/src/` | Must add shadcn/ui Input, Textarea, Select, Checkbox components (or build them with Tailwind) |
| `packages/ui/package.json` | Must add Radix primitives (`@radix-ui/react-select`, `@radix-ui/react-checkbox`, `@radix-ui/react-label`, etc.) |

## Approaches

### 1. Full shadcn/ui Bootstrap + Field Registry

Add ALL needed shadcn/ui components (`input`, `textarea`, `select`, `checkbox`, `switch`, `label`, `form`, `calendar` for date, `popover` for date picker). Build a field-type registry mapping each `DynamicFieldType` to its shadcn/ui component. Use React Hook Form with `zodResolver` and a `createFieldValueSchema(fields)` factory.

- **Pros**: Rich, accessible, consistent UI. shadcn/ui handles keyboard nav, focus rings, error states. The `Form` component integrates natively with RHF.
- **Cons**: Bootstrap overhead — need to run `npx shadcn@latest add` for ~8-10 components. Each adds ~50-150 lines. Date picker needs `react-day-picker` or `@radix-ui/react-popover` + calendar primitive. Higher initial complexity.
- **Effort**: Medium

### 2. Tailwind-Only Lightweight Inputs

Build everything with Tailwind CSS classes directly in the DynamicForm component. No new npm dependencies. Use native HTML inputs with Tailwind styling matching the existing design system.

- **Pros**: Zero new dependencies. Simple, fast to implement. Full control over markup.
- **Cons**: Must re-implement keyboard nav, focus rings, error states from scratch. No accessibility primitives from Radix. Select/MultiSelect/DatePicker are hard to build well without a library. Inconsistent with the project's declared intent to use shadcn/ui.
- **Effort**: Low (for simple types), High (for complex types like DatePicker, Select with search, MultiSelect)

### 3. Hybrid — shadcn/ui Core + Native for Simple Types

Add shadcn/ui `Input`, `Textarea`, `Label`, `Form` (the RHF wrapper). For complex inputs (DatePicker, Select) use a battle-tested library like `react-day-picker`. For boolean use a styled checkbox. This avoids the full shadcn/ui bootstrap while getting the critical RHF integration.

- **Pros**: Gets the RHF + Zod integration pattern right. Only adds what's needed. The `Form` component provides a clean `<FormField>` pattern.
- **Cons**: Still adds 3-4 npm dependencies (`react-day-picker`, `date-fns`). Select component needs careful implementation. Mixed approach may feel inconsistent.
- **Effort**: Medium

### 4. Registry Pattern Only — No shadcn/ui Form Wrapper

Skip the shadcn/ui `Form` component entirely. Use React Hook Form directly (`register`, `Controller` for controlled components). Each field type renders a `<FormField>` with Tailwind styling. The field registry maps type → component.

- **Pros**: No shadcn/ui bootstrap needed. Direct RHF access. Less abstraction.
- **Cons**: Must manually wire `Controller` for complex inputs (DatePicker, Select). More boilerplate in each field component. Less consistent than the `FormField` pattern.
- **Effort**: Low-Medium

## Recommendation

**Approach 3 — Hybrid shadcn/ui Core + Native for Simple Types**, with the following specifics:

### Why
1. **shadcn/ui is the declared path**: The project has `components.json` configured, `new-york` style, CSS vars wired up. The Button component already follows the pattern. The investment to add more shadcn components is low and aligns with the architecture.
2. **React Hook Form integration is critical**: The `@hookform/resolvers/zod` + shadcn `Form` component provides a battle-tested pattern that handles validation messages, error display, and accessibility out of the box.
3. **Date picker is the elephant**: A proper date picker (DATE/DATETIME types) is the hardest input to build from scratch. `react-day-picker` v9 is the recommended companion to shadcn/ui date pickers and handles both date and date-time.
4. **Deferred types need graceful degradation**: FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION (5 of 18 types) depend on Phase 3+ infrastructure. The form should render them as "Coming soon" placeholders, not block the slice.

### Component Architecture

```
apps/web/src/components/forms/
├── dynamic-form.tsx              # Main DynamicForm — receives DynamicFieldDefinition[], renders fields
├── field-registry.ts             # Map: DynamicFieldType → React component + default Zod schema
├── fields/
│   ├── text-field.tsx            # SHORT_TEXT → Input
│   ├── long-text-field.tsx       # LONG_TEXT → Textarea
│   ├── number-field.tsx          # NUMBER → Input type="number"
│   ├── decimal-field.tsx         # DECIMAL → Input type="number" step="0.01"
│   ├── currency-field.tsx        # CURRENCY → Input with unit suffix
│   ├── boolean-field.tsx         # BOOLEAN → Checkbox / Switch
│   ├── date-field.tsx            # DATE → DatePicker (react-day-picker)
│   ├── datetime-field.tsx        # DATETIME → DateTimePicker
│   ├── select-field.tsx          # SELECT → Select dropdown
│   ├── multi-select-field.tsx    # MULTI_SELECT → Checkbox group
│   ├── url-field.tsx             # URL → Input type="url"
│   ├── email-field.tsx           # EMAIL → Input type="email"
│   ├── phone-field.tsx           # PHONE → Input type="tel"
│   ├── deferred-field.tsx        # FILE/IMAGE/RELATIONS → Placeholder
│   └── form-field-wrapper.tsx    # Shared wrapper: label, required asterisk, help text, error display
└── __tests__/
    ├── dynamic-form.test.tsx
    ├── field-registry.test.ts
    └── fields/ (per-type tests)
```

### Zod Schema Factory

```typescript
// packages/validation/src/dynamic-field.ts — NEW export
export function createFieldValueSchema(fields: DynamicFieldDefinition[]): z.ZodObject<...> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let base: z.ZodTypeAny;
    switch (field.type) {
      case 'NUMBER':    base = z.number(); if (field.validation?.min != null) base = base.min(field.validation.min); /* ... */ break;
      case 'SHORT_TEXT': base = z.string(); /* minLength, maxLength, pattern */ break;
      case 'BOOLEAN':   base = z.boolean(); break;
      case 'SELECT':    base = z.string(); break;
      case 'MULTI_SELECT': base = z.array(z.string()); break;
      case 'DATE':      base = z.string().date(); break;
      // ... all 18 types
    }
    if (!field.required) base = base.optional();
    shape[field.key] = base;
  }
  return z.object(shape);
}
```

### Data Flow

```
Server Component (page.tsx)
  → fetches DynamicFieldDefinition[] via service
  → passes definitions to <DynamicForm fields={definitions} onSubmit={...} />
  
DynamicForm (Client Component)
  → createFieldValueSchema(fields) → Zod schema
  → useForm({ resolver: zodResolver(schema), defaultValues: {...} })
  → renders fields in order using field-registry
  → on submit → calls onSubmit(values)
  
FieldRegistry
  → type → { Component, defaultZodType }
  → each Component receives { field: DynamicFieldDefinition, control, errors }
```

### Input Type Mapping

| Field Type | Component | Zod Base Type | Deferred? |
|------------|-----------|---------------|-----------|
| SHORT_TEXT | `<Input>` | `z.string()` | No |
| LONG_TEXT | `<Textarea>` | `z.string()` | No |
| NUMBER | `<Input type="number">` | `z.number()` | No |
| DECIMAL | `<Input type="number" step="0.01">` | `z.number()` | No |
| CURRENCY | `<Input>` + unit | `z.number()` | No |
| BOOLEAN | `<Checkbox>` or `<Switch>` | `z.boolean()` | No |
| DATE | DatePicker (`react-day-picker`) | `z.string()` | No |
| DATETIME | DateTimePicker | `z.string()` | No |
| SELECT | `<Select>` (shadcn) | `z.string()` | No |
| MULTI_SELECT | Checkbox group | `z.array(z.string())` | No |
| URL | `<Input type="url">` | `z.string().url()` | No |
| EMAIL | `<Input type="email">` | `z.string().email()` | No |
| PHONE | `<Input type="tel">` | `z.string()` | No |
| FILE | DeferredField | `z.any().optional()` | **Yes — Phase 4** |
| IMAGE | DeferredField | `z.any().optional()` | **Yes — Phase 4** |
| ITEM_RELATION | DeferredField | `z.string().optional()` | **Yes — Phase 3** |
| LOCATION_RELATION | DeferredField | `z.string().optional()` | **Yes — Phase 6** |
| USER_RELATION | DeferredField | `z.string().optional()` | **Yes — Phase 3** |

### Scope Boundary

**IN SCOPE (Slice 4)**:
- `createFieldValueSchema(fields)` factory in `packages/validation/src/dynamic-field.ts`
- DynamicForm component in `apps/web/src/components/forms/`
- Field registry + 13 active field type components
- DeferredField placeholder for 5 types (FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION)
- Renders required indicators, help text, validation errors
- Tests: Zod schema factory tests + component render tests + integration test (render form from definitions array)

**OUT OF SCOPE**:
- Form submission to API (Phase 3 — Items CRUD)
- File upload component (Phase 4)
- Image upload component (Phase 4)
- Item relation selector (Phase 3 — needs Items)
- Location relation selector (Phase 6 — needs Locations)
- User relation selector (Phase 3 — needs user listing)
- Form layout/grouping/flexibility options

### Dependencies to Add

```bash
pnpm add @hookform/resolvers --filter @mantemap/web         # zodResolver for RHF
pnpm add react-day-picker date-fns --filter @mantemap/web    # Date picker
pnpm add @radix-ui/react-label --filter @mantemap/ui         # Label component
pnpm add @radix-ui/react-checkbox --filter @mantemap/ui      # Checkbox
pnpm add @radix-ui/react-select --filter @mantemap/ui        # Select
pnpm add @radix-ui/react-switch --filter @mantemap/ui        # Switch (alternative to checkbox)
```

## Risks

1. **shadcn/ui bootstrap adds complexity**: Each component added via `npx shadcn@latest add` copies source files. These need to be component-tested and maintained. Risk: Medium — mitigated by only adding what's needed (Input, Textarea, Select, Checkbox, Label, Form ~6 components).

2. **`react-day-picker` date handling**: Date input is notoriously complex (locale, timezone, format). Risk: Medium — mitigated by using `date-fns` and keeping it simple (ISO string in/out).

3. **MULTI_SELECT UX complexity**: A proper multi-select with search and tags is hard. shadcn/ui doesn't ship one. Risk: Medium — mitigated by implementing as a checkbox group (simple but functional) for Slice 4, deferring enhanced UX.

4. **Zod schema factory must stay in sync**: If field types or validation keys change, the factory must be updated. Risk: Low — the factory lives alongside the existing schemas; test coverage will catch drift.

5. **Missing `@hookform/resolvers`**: This is a required runtime dependency. Risk: Low — trivial `pnpm add`.

6. **Deferred types in form data**: The form will still include keys for deferred types (empty/placeholder values). This is intentional — the field definition says the key exists, the form should render it. When Phase 3 arrives, the value types will already be correct.

## Ready for Proposal

**Yes** — the exploration provides clear answers to all design questions. The orchestrator should proceed to `sdd-propose` with this context.

Key decisions for the proposal:
1. Package: `apps/web/src/components/forms/` (domain component, not generic UI)
2. Architecture: Field registry + per-type components + Zod schema factory
3. UI approach: Hybrid — add essential shadcn/ui components (Input, Textarea, Select, Checkbox, Label, Form) + react-day-picker for dates
4. Deferred types: Rendered as placeholders, .optional() in Zod schema
5. Missing deps: `@hookform/resolvers`, `react-day-picker`, `date-fns`, `@radix-ui/react-label`, `@radix-ui/react-checkbox`, `@radix-ui/react-select`
