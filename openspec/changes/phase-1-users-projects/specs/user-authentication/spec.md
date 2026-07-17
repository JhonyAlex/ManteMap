# User Authentication Specification

## Purpose

Define public credentials access, first-user bootstrap, validation, sessions, and protected route behavior.

## Requirements

### Requirement: Credentials registration and validation

The system MUST allow public registration with a normalized email and password. Passwords MUST satisfy the configured minimum and maximum policy, including the password-hashing byte limit. Duplicate emails MUST be rejected without revealing unrelated account details.

#### Scenario: Valid registration

- GIVEN no account uses the normalized email and the password satisfies policy
- WHEN the visitor submits registration
- THEN an active user is created and an authenticated session MAY be established

#### Scenario: Invalid or duplicate registration

- GIVEN an invalid, weak, too-long, or already-used email/password input
- WHEN the visitor submits registration
- THEN no user is created and a safe validation or conflict response is returned

### Requirement: Atomic first-user bootstrap

The first successful registration MUST atomically create the initial active system owner with global role `ADMIN`. Later registrations MUST receive the default non-admin role. Concurrent registrations MUST produce exactly one initial `ADMIN`.

#### Scenario: Concurrent empty-system registration

- GIVEN the system has no users and two valid registrations arrive concurrently
- WHEN both registration operations complete
- THEN exactly one user is `ADMIN`, both operations are consistent, and no partial user is retained

#### Scenario: Database failure during registration

- GIVEN registration cannot commit because of a database failure
- WHEN the operation fails or exhausts its safe retry policy
- THEN no partial account is exposed and the client receives a safe temporary-failure response

### Requirement: Authentication sessions and protected routes

The system MUST authenticate valid credentials, reject inactive or invalid accounts, and expose only the minimum session identity required by the application. Protected UI routes and every protected API operation MUST reject missing or invalid sessions with `401` or a redirect; invalid sessions MUST NOT grant access.

#### Scenario: Valid and invalid login

- GIVEN an active account, or unknown/invalid credentials
- WHEN credentials are submitted
- THEN only the active account receives a session; failures use a generic safe response

#### Scenario: Invalid session on protected access

- GIVEN a missing, expired, tampered, or otherwise invalid session
- WHEN a protected route is requested
- THEN access is denied and no protected data is returned

### Requirement: Deferred verification scope

The system MUST NOT require email verification in this phase and MUST NOT implement SMTP, OAuth, invitations, or password reset behavior.

#### Scenario: Registration without verification

- GIVEN a valid public registration
- WHEN the account is created
- THEN the account can use the in-scope authentication flow without an email-verification step
