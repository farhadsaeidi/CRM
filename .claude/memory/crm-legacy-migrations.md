---
name: crm-legacy-migrations
description: "CRM's migration history was restarted on 2026-08-20; old data survives in legacy_* tables and is copied into the new models step by step, preserving ids"
metadata:
  node_type: memory
  type: project
---

**Superseded plan.** This note originally said the new apps had to reuse the legacy
names (`account.Owner`, `home.Customer`, …) and carry over the old migration files so
`django_migrations` would line up. Farhad then specified `AUTH_USER_MODEL =
"account.MyUser"` (2026-08-20), which makes that impossible — Django does not support
swapping the user model on an existing migration history.

**What was done instead** (step 1, backup at `~/backups/CRM_before_step1_*.sql`):

1. Renamed the four data tables to `legacy_account_owner`, `legacy_home_customer`,
   `legacy_home_customerowner`, `legacy_home_transaction`. Nothing was deleted.
2. Dropped Django's own bookkeeping tables (`django_migrations`, `django_content_type`,
   `auth_*`, `django_admin_log`, `django_session`) — the old history referenced apps
   that no longer exist, and `migrate` recreates all of these.
3. Fresh `migrate`, then `INSERT … SELECT` from the legacy table into the new one.

Users are done (12 rows → `account_myuser`, roles mapped from the old `is_superuser`
flag, image paths rewritten `owner/…` → `user/…`). The three `home` tables are still
waiting for step 3.

**Why it matters for the remaining copies:** ids must be preserved, because
`legacy_home_customerowner` and `legacy_home_transaction` reference owners by the
original id — renumbering silently detaches every customer and transaction from its
owner. And after each copy, advance the identity counter:
`SELECT setval(pg_get_serial_sequence('<table>','id'), (SELECT max(id) FROM <table>))`,
otherwise the first new insert collides at id=1.

**How to apply:** keep the `legacy_*` tables until step 3 is verified; dropping them is
Farhad's call. Password hashes copied across unchanged, so existing passwords still
work — the demo users' password is `123` (not `1234`, which is SAM's). See
[[crm-db-access]] and [[crm-skeleton-state]].
