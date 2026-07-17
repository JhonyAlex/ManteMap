# Project Management Specification

## Purpose

Define authenticated project creation and the non-destructive project lifecycle.

## Requirements

### Requirement: Authenticated project lifecycle

Any authenticated user MUST be able to create a project with validated, normalized identifying data. Authorized members MUST be able to list and read projects they belong to; only the owner MUST be able to update or archive a project. Archiving MUST NOT be destructive deletion.

#### Scenario: Create and manage a project

- GIVEN an authenticated user submits valid unique project data
- WHEN the project is created, read, updated, or archived by the appropriate actor
- THEN the operation succeeds and archived data remains retained

#### Scenario: Unauthenticated lifecycle request

- GIVEN no valid session exists
- WHEN a project lifecycle operation is requested
- THEN the operation is rejected with `401` and no project changes occur

### Requirement: Atomic creator ownership

Project creation MUST atomically assign the creator as `Project.ownerId` and create the creator's `ProjectMember` record with role `OWNER`. A failed transaction MUST leave neither the project nor membership.

#### Scenario: Owner membership is created with the project

- GIVEN an authenticated user creates a valid project
- WHEN creation commits
- THEN ownership and the `OWNER` membership exist together

#### Scenario: Project transaction failure

- GIVEN project or owner-membership persistence fails
- WHEN creation is attempted
- THEN both writes are rolled back and a safe error is returned

### Requirement: Project code uniqueness

Project codes MUST be unique according to the existing data model and validation rules. A duplicate code MUST return a safe conflict response and MUST NOT modify either project.

#### Scenario: Duplicate project code

- GIVEN a project already uses a normalized code
- WHEN another authenticated user submits that code
- THEN creation fails with `409` and no duplicate project or membership is created

### Requirement: Deferred destructive and schema operations

The system MUST NOT support destructive project deletion or require schema/migration operations as part of this capability.

#### Scenario: Archive request

- GIVEN an owner requests project removal from active work
- WHEN the archive operation succeeds
- THEN the project is inactive but retained for future governed handling
