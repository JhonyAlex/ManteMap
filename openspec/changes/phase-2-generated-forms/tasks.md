# Tasks: Phase 2 Slice 4 — Generated Forms

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1250 authored + ~510 shadcn boilerplate |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Components) → PR 3 (Docs) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Deps + shadcn bootstrap + `createFieldValueSchema` factory + tests | PR 1 | `pnpm test -- packages/validation` | N/A — schema factory has no runtime | Remove npm deps, shadcn files, factory code |
| 2 | Field registry, wrapper, 13 active + 1 deferred field components, DynamicForm, component tests | PR 2 | `pnpm test -- apps/web/src/components/forms` | `pnpm dev`, mount `<DynamicForm>` with sample definitions | Delete `apps/web/src/components/forms/` |
| 3 | Integration test, ADR-008, status update | PR 3 | `pnpm test` (full suite) | N/A — docs and test coverage | Revert ADR + status, remove integration test |

## Phase 1: Foundation (PR 1)

- [x] 1.1 Install `@hookform/resolvers`, `react-day-picker`, `date-fns` in `apps/web/package.json`
- [x] 1.2 Install `@radix-ui/react-label`, `react-checkbox`, `react-select`, `react-switch` in `packages/ui/package.json`
- [x] 1.3 Bootstrap shadcn/ui: `npx shadcn@latest add input textarea select checkbox switch label form` → `packages/ui/src/components/`
- [x] 1.4 Export new shadcn components from `packages/ui/src/index.ts`
- [x] 1.5 Add `createFieldValueSchema(fields)` to `packages/validation/src/dynamic-field.ts` — type-aware Zod schema factory. 13 active types get typed schemas with validation rules; 5 deferred types get `.optional()`. Applies required/optional, defaultValue mapping, per-type validation constraints.
- [x] 1.6 RED: Write Zod factory tests in `packages/validation/src/dynamic-field.test.ts` — schema shape, required enforcement, number range, text pattern, deferred optional, all 18 types
- [x] 1.7 GREEN: Implement factory, run `pnpm test -- packages/validation` until all pass

## Phase 2: Form Components (PR 2)

- [x] 2.1 Create `apps/web/src/components/forms/form-field-wrapper.tsx` — shared label, required asterisk, help text, error display via shadcn FormField
- [x] 2.2 Create `apps/web/src/components/forms/field-registry.ts` — `Map<DynamicFieldType, Component>` for 18 types
- [x] 2.3 Implement text fields: `text-field.tsx` (Input), `long-text-field.tsx` (Textarea), `url-field.tsx` (type=url), `email-field.tsx` (type=email), `phone-field.tsx` (type=tel) — each wrapping FormFieldWrapper
- [x] 2.4 Implement numeric fields: `number-field.tsx` (Input type=number), `decimal-field.tsx` (step=0.01), `currency-field.tsx` (Input + unit suffix)
- [x] 2.5 Implement `boolean-field.tsx` — Switch or Checkbox with controlled state
- [x] 2.6 Implement date fields: `date-field.tsx` (native `type="date"`), `datetime-field.tsx` (native `type="datetime-local"`) — ISO string I/O
- [x] 2.7 Implement `select-field.tsx` — shadcn Select populated from `field.options`, empty options show placeholder
- [x] 2.8 Implement `multi-select-field.tsx` — checkbox group from `field.options`, Zod `z.array(z.string())`
- [x] 2.9 Implement `deferred-field.tsx` — disabled placeholder "Coming soon" for FILE, IMAGE, ITEM_RELATION, LOCATION_RELATION, USER_RELATION
- [x] 2.10 Create `apps/web/src/components/forms/dynamic-form.tsx` — Client Component: `useForm({ resolver: zodResolver(schema), defaultValues })`, iterates fields via registry, renders each, `onSubmit(values)` on valid submit
- [x] 2.11 RED: Write component tests — registry completeness, per-type render, required/optional indicators, help text, deferred placeholder
- [x] 2.12 GREEN: Implement all components, run `pnpm test -- apps/web/src/components/forms` until pass

## Phase 3: Integration & Docs (PR 3)

- [x] 3.1-3.2 Skipped: Integration test — existing 33 component tests already cover multi-field form submission with typed output (`dynamic-form.test.tsx` lines 517–541). No additional coverage gap.
- [x] 3.3 Write ADR-008 in `docs/decisions/ADR-008-generated-forms.md` — decision: hybrid shadcn + registry pattern, Zod factory approach, deferred type strategy
- [x] 3.4 Update docs: `docs/progress/CURRENT_STATUS.md`, `ROADMAP.md`, `AGENTS.md` — mark Phase 2 Slice 4 complete, update ADR count, add history entry
- [x] 3.5 Final verification: `pnpm typecheck` (web/validation/shared clean; ui pre-existing path alias issues), `pnpm lint` (warnings only, no errors), `pnpm test` (583 passed, 51 pre-existing DB-dependent failures, 44 skipped)
- [x] 3.6 Update tasks.md — mark all remaining tasks complete
