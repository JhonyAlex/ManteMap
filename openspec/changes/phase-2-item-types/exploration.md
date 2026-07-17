# Exploration: Phase 2 Slice 1 — Item Type Management

## Current State

Phase 1 provides the required patterns: NextAuth session guards, project membership and ownership services, Prisma repositories, shared Zod schemas, and `{ data?, error?, message? }` API envelopes. `Project` already has project membership and an owner boundary.

Production was created with `prisma db push` and no trusted versioned migration history exists. The schema-only dump at `C:\Users\jhony\Downloads\mantemap-schema.sql` was inspected on 2026-07-17 and materially matches the pre-ItemType Prisma schema; backup state and live migration-history verification remain operator responsibilities.

## Conservative Assumptions

- Item Type names are human-readable and slugs are lowercase kebab-case identifiers.
- Reads include archived records so retained catalog history remains visible; archived records are not mutable.
- A wrong-project Item Type ID is equivalent to a missing resource.
- `DELETE` follows the existing non-destructive archive convention.
- Global `ADMIN` remains subject to project membership and ownership checks.

## Deferred Work

Dynamic fields and configurable statuses require separate data models and validation rules. They are deliberately not coupled to this slice.

## Operational Risk

The verified baseline and forward migration are now prepared under `packages/database/prisma/migrations/`. Production backup verification, migration-history verification, baseline marking, SQL review, and approved application are still required before deployment.
