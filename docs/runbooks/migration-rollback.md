# Runbook: Migration Rollback

## Context

Prisma does not support automatic rollback. If a migration causes issues in production, use one of the strategies below according to the type of failure.

---

## Scenario 1 — Migration failed mid-run (partial apply)

**Symptom**: `prisma migrate deploy` exited with error; `_prisma_migrations` shows the migration as `applied = false` or has a non-null `rolled_back_at`.

**Steps:**

1. Connect to the target database as `tenora_migrator`:

   ```bash
   psql "$DATABASE_URL_MIGRATOR"
   ```

2. Mark the failed migration as rolled back so Prisma skips it:

   ```sql
   UPDATE _prisma_migrations
   SET rolled_back_at = now()
   WHERE migration_name = '<migration_name>';
   ```

3. Manually undo any DDL that was partially applied (e.g., `DROP TABLE`, `ALTER TABLE ... DROP COLUMN`).

4. Fix the migration file in the repository, open a PR, and redeploy.

---

## Scenario 2 — Migration succeeded but caused a regression (data bug / bad logic)

**Symptom**: Application behaves incorrectly after deploy; the migration itself ran cleanly.

**Option A — Forward fix (preferred)**

Create a new migration that corrects the data or reverts the schema change:

```bash
pnpm --filter @tenora/db exec prisma migrate dev --name revert_<migration_name>
```

Push and deploy via the normal pipeline.

**Option B — Restore from backup (last resort)**

1. Scale down the API to zero replicas on Railway.
2. Restore the latest pre-migration snapshot from Railway's managed PostgreSQL backup UI.
3. In the `_prisma_migrations` table, delete the row for the reverted migration so Prisma will re-apply it after the fix.
4. Fix, re-test, and redeploy.

---

## Scenario 3 — Blocked deployment (migration takes too long / lock timeout)

**Symptom**: `prisma migrate deploy` hangs or times out due to a lock on a high-traffic table.

**Steps:**

1. Cancel the GitHub Actions run immediately.

2. Identify blocking queries:

   ```sql
   SELECT pid, query, state, wait_event_type, wait_event, now() - pg_stat_activity.query_start AS duration
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```

3. Terminate the blocking PID if safe:

   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```

4. Rewrite the migration to avoid full-table locks:
   - Add columns as `nullable` first, then add constraints in a separate migration.
   - Use `CREATE INDEX CONCURRENTLY` instead of a standard index.
   - Split large `ALTER TABLE` into multiple steps.

5. Redeploy with the revised migration.

---

## GitHub Secrets Required

| Secret                          | Environment |
| ------------------------------- | ----------- |
| `STAGING_DATABASE_URL`          | staging     |
| `STAGING_DATABASE_URL_MIGRATOR` | staging     |
| `PROD_DATABASE_URL`             | production  |
| `PROD_DATABASE_URL_MIGRATOR`    | production  |

Both `*_MIGRATOR` URLs must connect as a user with `BYPASSRLS` and `CREATEDB` privileges (e.g., `tenora_migrator`).

---

## GitHub Environment Setup (one-time)

1. Go to **Settings → Environments** in the GitHub repository.
2. Create an environment named **`production`**.
3. Enable **Required reviewers** and add at least one reviewer.
4. Add the four secrets above to their respective environments.
