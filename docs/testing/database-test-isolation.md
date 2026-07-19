# Isolate database-backed tests from development data

The current full Vitest suite includes **51 database-dependent test failures** when PostgreSQL is unavailable. Do not point these tests at the development or production database: several suites perform broad `deleteMany()` cleanup.

Latest offline verification (`pnpm --filter @mantemap/web test`, 2026-07-19): **2,267 total; 2,172 passed; 51 failed; 44 skipped** across 164 files. Five files are reported failed: the three counted suites below plus the two auth suites whose `beforeAll` hooks cannot connect.

## Current failure inventory

| Suite | Failed tests | Database behavior |
|---|---:|---|
| `src/lib/services/project-access-service.test.ts` | 13 | Creates users, projects, and memberships; cleanup deletes all three model sets. |
| `src/lib/services/project-service.test.ts` | 23 | Exercises transactions and project lifecycle; cleanup deletes all users, projects, and memberships. |
| `src/lib/services/user-service.integration.test.ts` | 15 | Exercises registration races and rollback; cleanup deletes all users, projects, and memberships. |
| **Counted total** | **51** | These are the failed-test count reported by Vitest. |

`src/auth.integration.test.ts` and `src/auth.providers.test.ts` also connect to PostgreSQL in `beforeAll`. When the database is unavailable, their hook failures are reported at suite level and **do not add to the 51 failed-test total**.

## Safety boundary

Do **not** use `docker-compose.dev.yml` as the automated test harness without isolation. It uses the persistent `postgres_data` volume and defaults to the `mantemap` database. Running cleanup against it can erase local development data; pointing the same tests at production would be destructive.

Before running database-backed tests, verify all of the following:

- The connection targets a dedicated test-only PostgreSQL instance and database.
- The database name and credentials are distinct from development and production.
- The instance uses an ephemeral volume or disposable container.
- The test command fails closed when the test-only connection variable is absent.
- No production or shared development secret is loaded into the test process.

## Recommended harness (future work unit)

1. Add a separate Compose file with an ephemeral PostgreSQL service, a unique database such as `mantemap_test`, and no reuse of `postgres_data`.
2. Add a test-only environment file or explicit `TEST_DATABASE_URL`; never fall back to `DATABASE_URL`.
3. Apply migrations to that disposable database before the suite.
4. Run database suites serially if their global cleanup cannot be made schema- or worker-scoped.
5. Tear down the container and volume after the run, including failed runs.

Suggested scripts once that harness exists:

```text
test:db:up       # start the dedicated ephemeral PostgreSQL service
test:db:migrate  # apply migrations using TEST_DATABASE_URL only
test:db          # run the five database-backed suites against that URL
test:db:down     # remove only the test container and its ephemeral volume
```

## Acceptance criteria for the harness

- A guard test proves the command refuses a non-test database name or host allowlist mismatch.
- Repeated runs start from an empty database and produce the same result.
- Test cleanup cannot reach the development Compose volume or production network.
- Hook failures in both auth suites are included in the harness result and reported separately from assertion failures.
- Teardown removes only resources created by the test harness.

Implementing the Docker harness is intentionally out of scope for this remediation.
