# Project Access Control Specification

## Purpose

Define server-authoritative, member-scoped access to project data and mutations.

## Requirements

### Requirement: Membership-scoped project access

Project reads MUST be limited to members of the project. Non-members MUST receive `404` for scoped project access so project existence is not disclosed. The global `ADMIN` role MUST NOT create an implicit project bypass.

#### Scenario: Member reads a project

- GIVEN an authenticated user has a membership in the project
- WHEN the user requests the project
- THEN the project data is returned

#### Scenario: Non-member reads a project

- GIVEN an authenticated user has no membership in the project
- WHEN the user requests the project
- THEN the response is `404` and no project data is returned

### Requirement: Owner mutation boundary

Only the project owner MUST update or archive the project. Authenticated non-owner members MAY read according to membership but MUST receive `403` for owner-only mutations. Authorization MUST be enforced for every server request, not only navigation.

#### Scenario: Owner mutation

- GIVEN the authenticated actor is the project owner
- WHEN the actor submits a valid update or archive request
- THEN the requested mutation succeeds

#### Scenario: Non-owner mutation

- GIVEN the authenticated actor is a project member but not the owner
- WHEN the actor submits an owner-only mutation
- THEN the response is `403` and the project is unchanged

### Requirement: Access failure safety

Invalid sessions MUST receive `401`; authorization failures MUST not leak protected project data or database details. The phase MUST defer a detailed role-permission matrix.

#### Scenario: Invalid session on project API

- GIVEN a missing or invalid session
- WHEN any protected project API is requested
- THEN the response is `401` and no membership or project data is returned
