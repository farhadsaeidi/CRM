---
name: crm-db-access
description: "CRM's live database was moved to the Linux Postgres 18 cluster on port 5434 (like SAM); a stale copy remains on Windows 5433 and connecting to it fails silently"
metadata:
  node_type: memory
  type: project
---

**Migrated 2026-08-20**, at Farhad's request, mirroring what was done for SAM: the
`CRM` database now lives on the **Linux** PostgreSQL 18 cluster, **port 5434**.
Method: `pg_dump` from Windows PG 18 `:5433` (using the *18* client at
`C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` — the 17 client would refuse a
version mismatch) → `createdb` → restore. Verified identical afterwards: 12 owners,
32 customers, 32 customer-owner links, 43 transactions, 36 permissions, 9 content
types, 28 migrations, 9 sessions. Sequences carried over, so new inserts won't collide.

> **Two `CRM` databases now exist.** The one on Windows `:5433` is frozen at the moment
> of migration and is still what the legacy `CustomerManagement` project uses.
> Connecting to it raises no error — you just silently work on stale data. Always pass
> the port explicitly. Port 5432 (Windows PG 17) has no `CRM` at all.

Two operational facts:
- **The cluster autostarts since 2026-08-20.** This WSL has no systemd (`init` is
  `init(Ubuntu)`, `/run/systemd/system` absent), so `/etc/wsl.conf` now carries a
  `[boot] command = /usr/bin/pg_ctlcluster 18 main start` hook — the only hook
  available without systemd. It covers SAM too, since both databases share the
  cluster. This matters because `runserver`'s `check_migrations()` opens a connection
  unconditionally (`--skip-checks` does not skip it), so a `down` cluster killed
  Django at startup. If `pg_lsclusters` ever shows `down`, start it by hand with
  `wsl -u root -e pg_ctlcluster 18 main start`.
- **`sudo` needs a password here**, but `wsl -u root -e …` gives root from the Windows
  host without one — that is the way to run privileged WSL commands.

**Why:** before the migration the database was unreachable from WSL entirely
(`.wslconfig` is `networkingMode=NAT`, so Linux `localhost` is not Windows' loopback,
and Windows Firewall drops connections from the WSL subnet — they time out rather than
refuse). Moving the data removed the dependency instead of poking a firewall hole.
**How to apply:** the project `.env` holds `DB_HOST=localhost` / `DB_PORT=5434` — read
credentials from there, never hardcode or print them. The Windows copy of the project
keeps `DB_PORT=5433` and should stay that way; the WSL copy is the reference. See
[[crm-legacy-migrations]] and [[crm-wsl-env]].
