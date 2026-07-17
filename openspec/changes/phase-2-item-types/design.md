# Design: Phase 2 Slice 1 — Item Type Management

## Flow

```text
API route → session guard → Zod → ItemTypeService → project access guard → ItemTypeRepository → Prisma
```

Routes know HTTP status mapping only. Services enforce business rules. Repositories receive `projectId` for every Item Type query and own Prisma access.

## Data Model

`ItemType` contains `id`, `projectId`, `name`, `slug`, `description`, `icon`, `color`, `status`, `createdAt`, and `updatedAt`. `status` is `ACTIVE` or `ARCHIVED`. The database enforces `unique(projectId, slug)` and indexes project/status and project/name.

## Authorization

`requireProjectMember` guards list/read. `requireProjectOwner` guards create/update/archive. Both preserve Phase 1 behavior: a non-member receives `404`, a member without ownership receives `403`, and `ADMIN` has no implicit bypass.

## Lifecycle

The service checks the project-scoped record before mutation. Archived records return `404` for update and archive attempts. DELETE calls an archive repository operation and retains the row.

## Error Mapping

Routes map validation and malformed JSON to `400`, access errors to `404`/`403`, duplicate slugs to `409`, and unknown failures to a generic `500`. Prisma details never cross the API boundary.

## Rollout

Migration artifacts are prepared in `packages/database/prisma/migrations/`: a production-equivalent baseline followed by the ItemType forward migration. Production must first complete the ADR-005 backup, migration-history verification, baseline-marking, and reviewed application procedure.
