# Proposal: Generated Forms from Dynamic Field Definitions

## Intent

Eliminate manual form building per item type. Given an `ItemType`'s `DynamicFieldDefinition[]`, render a complete, validated form automatically — no hand-coded `<input>` per field.

## Scope

### In Scope
- `<DynamicForm>` Client Component accepting `DynamicFieldDefinition[]` with React Hook Form + Zod resolver
- `createFieldValueSchema(fields)` factory building Zod schemas from field definitions
- Field registry mapping each `DynamicFieldType` to its input component
- 13 active field types with real inputs: SHORT_TEXT, LONG_TEXT, NUMBER, DECIMAL, CURRENCY, BOOLEAN, DATE, DATETIME, SELECT, MULTI_SELECT, URL, EMAIL, PHONE
- Required indicators, help text, default values, placeholder text
- Bootstrap shadcn/ui Input, Textarea, Select, Checkbox, Switch, Label, Form + react-day-picker for dates
- Unit and component tests (Zod factory + per-type rendering + integration)

### Out of Scope
- Saving form data (Phase 3 — Items CRUD)
- FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION (deferred with placeholder components)
- Form layout/styling customization
- Multi-step or wizard forms
- Conditional field visibility

## Capabilities

### New Capabilities
- `form-generation`: Dynamically render validated React Hook Form forms from `DynamicFieldDefinition[]`. 13 type-to-component mappings. Zod schema factory enforces per-type validation rules (min/max, minLength/maxLength, pattern, required). Five deferred types render as placeholders with `.optional()` schemas.

### Modified Capabilities
- None

## Approach

**Hybrid shadcn/ui core + native for simple types** (Approach 3 from exploration):

1. Add `@hookform/resolvers`, `react-day-picker`, `date-fns`, and Radix primitives (`label`, `checkbox`, `select`, `switch`)
2. Bootstrap shadcn/ui Input, Textarea, Select, Checkbox, Switch, Label, Form via `npx shadcn@latest add`
3. Build `createFieldValueSchema(fields)` in `packages/validation/src/dynamic-field.ts` — Zod object factory per the 18-type mapping table
4. Build field registry (`DynamicFieldType → React.Component`) with per-type components under `apps/web/src/components/forms/fields/`
5. Shared `FormFieldWrapper` handles label, required asterisk, help text, error display
6. SELECT renders shadcn/ui `<Select>`, MULTI_SELECT renders checkbox group (simple, functional)
7. DATE/DATETIME use `react-day-picker` with ISO string I/O
8. Deferred types render `<DeferredField>` placeholder

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/validation/src/dynamic-field.ts` | Modified | Add `createFieldValueSchema` export |
| `apps/web/src/components/forms/` | New | DynamicForm, field registry, 14 field components |
| `packages/ui/src/` | Modified | Add shadcn/ui Input, Textarea, Select, Checkbox, Switch, Label, Form |
| `apps/web/package.json` | Modified | Add `@hookform/resolvers`, `react-day-picker`, `date-fns` |
| `packages/ui/package.json` | Modified | Add `@radix-ui/react-label`, `react-checkbox`, `react-select`, `react-switch` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| shadcn/ui bootstrap adds maintenance burden | Medium | Only add 7 components; copilot-maintained source files |
| react-day-picker date complexity | Medium | Keep it simple: ISO string in/out; use `date-fns` |
| MULTI_SELECT UX gap without library | Medium | Checkbox group is functional; enhanced UX deferred |
| Zod factory drift from field types | Low | Lives in same module as existing schemas; test coverage catches drift |

## Rollback Plan

Revert the components and npm dependency additions. The Zod factory in `packages/validation` has no runtime callers until consumed — safe to remove. No database changes.

## Dependencies

- `@hookform/resolvers` (not yet installed)
- `react-day-picker` + `date-fns` (not yet installed)
- Radix primitives: `@radix-ui/react-label`, `react-checkbox`, `react-select`, `react-switch` (not yet installed)

## Success Criteria

- [ ] `createFieldValueSchema(fields)` returns Zod schema enforcing required, type, and validation rules
- [ ] Form renders all 13 active field types with correct native/shadcn input
- [ ] SELECT renders dropdown options, MULTI_SELECT renders checkbox group
- [ ] Required fields show asterisk and fail Zod validation when empty
- [ ] NUMBER respects min/max, SHORT_TEXT respects minLength/maxLength/pattern
- [ ] `form.handleSubmit(onSubmit)` yields typed, validated data matching field definitions
- [ ] Deferred types render placeholder without breaking form
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript infers correct types from field definitions
