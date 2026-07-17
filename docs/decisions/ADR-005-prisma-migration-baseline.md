# ADR-005: Production Prisma Migration Baseline

## Status

Accepted. Migration artifacts are prepared; operational rollout remains pending.

## Decision

ManteMap will not apply the Phase 2 `ItemType` schema to production until the deployed PostgreSQL database has been inspected, backed up, and reconciled with the checked-in Prisma schema. The database was originally created with `prisma db push` and has no trusted versioned migration history.

The schema-only dump at `C:\Users\jhony\Downloads\mantemap-schema.sql` was inspected on 2026-07-17. It reports PostgreSQL 16.14 and contains the four production enums (`ProjectRole`, `ProjectStatus`, `UserRole`, `UserStatus`), the six application tables (`users`, `accounts`, `sessions`, `verification_tokens`, `projects`, and `project_members`), their primary keys, unique/index definitions, and foreign keys. It also contains `_prisma_migrations`, which is Prisma-owned metadata and is intentionally excluded from the baseline migration. It does not contain `item_types` or `ItemTypeStatus`.

The dump was compared with `packages/database/prisma/schema.prisma`. The pre-ItemType objects match materially, including quoted camel-case columns, defaults, index names, and referential actions. The repository-only delta is the `ItemTypeStatus` enum and the `item_types` table with its primary key, project-scoped unique slug index, project/status and project/name indexes, and cascading project foreign key.

The prepared migration paths are:

- `packages/database/prisma/migrations/20260717000000_baseline_production_schema/migration.sql`
- `packages/database/prisma/migrations/20260717000100_add_item_types/migration.sql`

The production owner must perform this reviewed baseline procedure:

1. Create and verify a restorable production backup before any migration-table operation.
2. Verify the production `_prisma_migrations` history and confirm whether any migration names are already recorded.
3. Confirm that the baseline SQL is equivalent to the inspected production schema and that the baseline directory is not already recorded as applied.
4. Mark `20260717000000_baseline_production_schema` as applied only after the backup, history, and equivalence checks succeed; do not execute its create statements against an already populated schema.
5. Review `20260717000100_add_item_types/migration.sql` for the enum, table, indexes, primary key, and `ON DELETE CASCADE` project foreign key.
6. Apply the ItemType migration during an approved deployment window and verify the resulting schema.

This task prepares migration artifacts from verified schema evidence. It does not apply either migration and does not run `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, reset, or any other database-mutating command.

## Consequences

- The application code and tests can be reviewed before production schema rollout.
- Deploying the new API against a database without `item_types` is unsupported until the prerequisite is complete.
- The baseline migration must never be run as create-DDL against the existing production database; the operator must mark it applied only after confirming equivalence.
- The ItemType migration must preserve existing Phase 1 data and must be tested against a production-like backup.

## Scope Boundary

Dynamic fields and configurable statuses are deferred to later Phase 2 slices. This ADR covers only the operational safety gate for the Item Type model.
