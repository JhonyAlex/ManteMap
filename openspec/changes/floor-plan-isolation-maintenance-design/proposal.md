# Proposal: Floor Plan Isolation and Maintenance Design

## Intent

Close a verified cross-project ownership gap in floor-plan operations before extending spatial workflows, and freeze the preventive-maintenance domain rules needed for a later additive migration. Generic calendar events are not durable maintenance occurrences.

## Scope

### In Scope
- Enforce project ownership chains for locations, floor plans, markers, and associated items; reject duplicate item markers per plan.
- Add negative tests for cross-project reads, image access, creation, update, and deletion.
- Specify maintenance scheduling, lifecycle, permissions, audit, and the future additive model/migration.

### Out of Scope
- Maintenance Prisma models or migration in this work unit.
- Generator, calendar, panel, maintenance alerts, onboarding, or marker-configuration UI.

## Capabilities

### New Capabilities
- `preventive-maintenance`: Durable plans, generated work orders, checklist snapshots, recovery, permissions, and audit semantics.

### Modified Capabilities
- `floor-plan-management`: Require complete project ownership chains for every plan, location, marker, image, and item association.

## Approach

First refactor `floor-plan-service.ts` and its repository queries around project-scoped resolvers, with RED negative tests before production changes. Then, in a separate later work unit, add the models defined by ADR-009 through a new additive migration. The existing audit remains design input, not proof of implementation.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/lib/services/floor-plan-service.ts` | Modified now | Central ownership-chain enforcement |
| `apps/web/src/lib/repositories/floor-plan-repository.ts` | Modified now | Project-scoped resource queries |
| `apps/web/src/lib/services/floor-plan-service.test.ts` | Modified now | Negative isolation matrix |
| `packages/database/prisma/schema.prisma` | Planned | Maintenance models and project scheduling fields |
| `docs/decisions/ADR-009-maintenance-generation-and-isolation.md` | New | Frozen architecture decision |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Identifier probing leaks another project | High | Return safe not-found responses before storage/mutation calls |
| Concurrent generation duplicates orders | High | Future database unique key plus transactional hourly generator |
| Plan edits rewrite operational history | Medium | Snapshot checklists; explicit audited future regeneration only |

## Rollback Plan

Revert the scoped resolver/service changes and tests as one work unit. The planning documents are removable independently. No schema or persisted data changes occur in this work unit.

## Dependencies

- Existing project membership guards and repository/service separation.
- ADR-005 migration baseline for the later additive migration.

## Success Criteria

- [ ] Cross-project plan/location/marker/item paths fail safely without side effects.
- [ ] Duplicate item association on one plan is rejected.
- [ ] Maintenance lifecycle, generation, recovery, permissions, models, and migration plan are unambiguous.
- [ ] No maintenance schema, migration, UI, generator, or alerts are implemented yet.
