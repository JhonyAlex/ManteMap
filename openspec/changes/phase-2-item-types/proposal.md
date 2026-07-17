# Proposal: Phase 2 Slice 1 — Item Type Management

## Intent

Introduce the smallest useful project-scoped Item Type capability: owners manage the type catalog while project members can read it safely.

## In Scope

- Project-scoped `ItemType` persistence with active and archived states.
- Owner-only create, update, and archive operations.
- Member-scoped list and read operations.
- Shared Zod validation, repository/service boundaries, and protected API routes.
- Focused authorization, scoping, validation, archive, and safe-error tests.

## Out of Scope

- Dynamic field definitions and generated item forms.
- Configurable statuses, status transitions, or status metadata.
- Items/assets, documents, UI screens, invitations, or role administration.
- Production migration application. Schema baselining is an operational prerequisite documented in ADR-005.

## Success Criteria

- Item Type lookups cannot cross project boundaries.
- Non-members receive `404`; members read; only owners mutate; global `ADMIN` has no bypass.
- `DELETE` archives and never physically deletes.
- Malformed input and persistence conflicts return safe API envelopes.
