---
name: crm-legacy-migrations
description: "Do not run migrate on CRM — the database carries the old project's migration history; new apps must reuse the app and model names account/home/Owner/Customer/Transaction"
metadata:
  node_type: memory
  type: project
---

The `CRM` database is the legacy `CustomerManagement` database, still holding its
tables (`account_owner`, `home_customer`, `home_customerowner`, `home_transaction`)
and, critically, its `django_migrations` rows for the apps `account`, `home`,
`auth`, `admin`, `contenttypes`, `sessions`.

**Never run `migrate` until the domain apps exist and their migrations are aligned.**
`auth.0001_initial` is recorded as applied but `auth_user` does not exist — the old
project used `AUTH_USER_MODEL = account.Owner`. Django will believe tables exist that
don't, and the failure will be confusing and mid-way.

**Why:** Farhad explicitly chose (2026-08-20) to keep the old database and its data
(12 owners, 32 customers, 43 transactions) rather than start a fresh one. That
decision makes the migration history a hard constraint on how the new apps are named.
**How to apply:** when adding the domain layer, create apps named exactly `account`
and `home` with models named exactly `Owner`, `CustomerOwner`, `Customer`,
`Transaction`, and carry over the old migration files, so table names and history
line up. Take a `pg_dump` backup before any structural change. See
[[crm-project-brief]] and [[crm-db-access]].
