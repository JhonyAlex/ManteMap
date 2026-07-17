# Tasks: Phase 2 Slice 1 — Item Type Management

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850–1,150 |
| 400-line budget risk | High |
| Delivery strategy | single bounded implementation requested; no commit/push |
| Runtime harness | N/A without mutating or provisioning a database |

## Tasks

- [x] 1.1 Add the project-scoped Prisma ItemType model and status enum without a database command.
- [x] 1.2 Add shared create/update Zod schemas and exports.
- [x] 1.3 Add repository and service layers with membership/owner policy, project scoping, duplicate mapping, and archive semantics.
- [x] 1.4 Add collection and resource API routes with safe error envelopes.
- [x] 1.5 Add focused service and route tests for auth, scoping, authorization, validation, conflicts, safe errors, and archival behavior.
- [x] 1.6 Add ADR-005, OpenSpec artifacts, reconcile project status documentation, and prepare the reviewed migration artifacts from the production schema dump.

## Evidence

Focused tests, lint, typecheck, and Prisma schema validation are to be run without a database-mutating command. Production rollout remains pending operator backup/history verification and deployment-window application. Rollback boundary: ItemType schema, validation, repository/service/routes/tests, migration artifacts, and the Phase 2 documentation paths listed in this change.
