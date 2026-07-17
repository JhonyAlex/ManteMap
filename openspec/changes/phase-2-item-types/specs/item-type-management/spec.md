# Item Type Management Specification

## Requirement: Project-scoped catalog

The system MUST store each Item Type under exactly one project and MUST enforce a unique slug within that project.

### Scenario: Same slug in separate projects

- GIVEN two distinct projects
- WHEN each project creates an Item Type with slug `pump`
- THEN both creations succeed and neither record is visible through the other project

## Requirement: Membership-scoped reads

Members MUST be able to list and read Item Types belonging to their project. Non-members, including global `ADMIN` users without membership, MUST receive `404`.

### Scenario: Wrong-project resource ID

- GIVEN an Item Type belongs to project A
- WHEN a member of project B requests that ID through project B
- THEN the API returns `404` and does not disclose the record

## Requirement: Owner-only mutations

Only the project owner MUST create, update, or archive Item Types. A non-owner member MUST receive `403`; global `ADMIN` MUST NOT bypass this rule.

## Requirement: Validation and conflicts

Create and update input MUST be validated with the shared Zod schemas. Malformed JSON or invalid input MUST return `400`. A duplicate project-scoped slug MUST return `409` without leaking database details.

## Requirement: Non-destructive archive

DELETE MUST set status to `ARCHIVED` and retain the record. Archived Item Types MUST NOT be updated or archived again and those attempts MUST return `404`.

## Deferred Requirements

Dynamic fields, configurable statuses, generated forms, and item records are outside this bounded slice.
