---
name: crm-skeleton-state
description: "As of 2026-08-20 CRM is a verified bare skeleton — stack wired end to end, no domain apps and no auth; Farhad directs each next phase"
metadata:
  node_type: memory
  type: project
---

State on 2026-08-20 (commit `86f6e23` plus the WSL migration):

**Done and verified end to end** — Django 6 + DRF on `:8000`, React 19 + Vite 8 +
Tailwind v4 on `:5173`, Vite proxying `/api`, `/media`, `/static`, `/django-admin`.
`/api/health/` returns JSON through the proxy; SPA deep links fall through to React;
`dir="rtl"`, the IRANSansXFaNum fonts, the numbered `var-color` theme and class-based
dark mode all confirmed live in the browser. eslint clean, `npm run build` and
`manage.py check` pass on both Windows and WSL.

**Deliberately absent:** no `account`/`home` apps, no models, no authentication —
Farhad chose "فقط اسکلت خالی، بدون احراز هویت" so he could direct each phase himself.
`frontend/src/index.css` already carries `grid-customer` and `grid-transaction`, ready
for the future tables.

Planned order (see `.claude/architecture.md` §6): `account` app + migrations → auth
layer → `home` app → customers API → transactions API → frontend screens.

**Why:** the scope was his explicit choice, not an oversight; and the skeleton being
*verified* rather than merely written is what makes the next phases safe to build on.
**How to apply:** don't add domain models or auth speculatively — wait for his
go-ahead. Before phase 1, [[crm-db-access]] must be resolved, since no migration can
run and no query can be tested until then. Also read [[crm-legacy-migrations]] first.
