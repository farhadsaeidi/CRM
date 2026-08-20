---
name: crm-wsl-env
description: "CRM's live copy is in WSL at ~/projects/python/django/CRM; venv is `venv/` not `.venv/`; calling wsl from Git Bash needs MSYS_NO_PATHCONV=1"
metadata:
  node_type: memory
  type: project
---

The working copy is **WSL Ubuntu**: `/home/farhad/projects/python/django/CRM`.
It was migrated there from `D:\Python\Django\CRM` on 2026-08-20 (rsync, then a fresh
Linux venv). Both copies share the same git history; edit only the WSL one from now on.

Environment facts that differ from SAM:
- The virtualenv is **`venv/`**, not `.venv/` — Farhad asked for `python3 -m venv venv`.
  Run Django as `venv/bin/python manage.py …`; `./manage.py` fails because its shebang
  is `python` and Ubuntu only has `python3`.
- WSL has Python 3.14.4 and Node 24.19; Windows has Python 3.12.7 and Node 24.16.
- `node_modules` and the venv are deliberately **not** copied between the two — their
  binaries are platform-specific. Reinstall on each side.

**Why:** two gotchas cost real time. `wsl -e env -i /bin/bash -lc '…'` is required so
Windows env vars don't clobber `$HOME` — but when invoked **from Git Bash on Windows**,
MSYS rewrites `/bin/bash` into `C:/Program Files/Git/usr/bin/bash` and the command dies
with `env: … No such file or directory`.
**How to apply:** prefix such calls with `MSYS_NO_PATHCONV=1`. Verify which copy you
are editing before making changes — the Windows one at `D:\Python\Django\CRM` is now
secondary. See [[crm-db-access]] for why some work still has to happen on Windows.
