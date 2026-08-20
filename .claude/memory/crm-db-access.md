---
name: crm-db-access
description: "CRM's database is Windows Postgres 18 on port 5433, and WSL cannot reach it — NAT networking plus a firewall drop; manage.py check passes but every query fails"
metadata:
  node_type: memory
  type: project
---

The `CRM` database lives on the **Windows** PostgreSQL 18 instance, port **5433**
(port 5432 is Windows PG 17 and has no `CRM` database — connecting there gives
`database "CRM" does not exist`). The Linux cluster on 5434 is `down`.

**From WSL this database is unreachable** (measured 2026-08-20):
- `~/.wslconfig` has `networkingMode=NAT`, so WSL's `localhost` is *not* Windows'
  loopback. `127.0.0.1:5433` from WSL → connection refused.
- Postgres does listen on `0.0.0.0:5433`, but connecting to the Windows host IP
  (`192.168.0.1`, the `vEthernet (WSL)` adapter) **times out after 6s** — a silent
  Windows Firewall drop. No inbound rule for postgres/5433 exists.

The dangerous part: `manage.py check` passes anyway (Django doesn't open a
connection), so the project looks healthy right up until the first query.

**Why:** SAM's `CLAUDE.md` claims WSL is on `networkingMode=mirrored` and that all
three Postgres ports answer on `localhost`. That is **stale** — it is NAT now, which
[[pycharm-wsl-tailwind]] independently confirms. Trusting that note wastes time.
**How to apply:** before any DB work in WSL, actually test the connection rather than
assuming. Three fixes, all requiring Farhad (firewall and sudo are his to run):
1. inbound firewall rule for 5433 on the WSL interface + `DB_HOST=192.168.0.1`
2. `sudo pg_ctlcluster 18 main start`, restore a `CRM` dump onto 5434, `DB_PORT=5434`
3. do DB-dependent work from the Windows copy at `D:\Python\Django\CRM` instead

Credentials come from `.env` (mode 600, gitignored) — never print its values.
