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

The whole stack runs in WSL end to end since the database was moved to the Linux
cluster later the same day — Django reads the real data (12 owners, 32 customers,
43 transactions) and `/api/health/` answers through the Vite proxy. See
[[crm-db-access]] for the one manual step needed after a WSL restart.

**Steps 1 and 2 landed 2026-08-20:** `account` app with `MyUser` (phone as
`USERNAME_FIELD`, roles owner/superuser, `is_superuser` a property off the role — SAM's
pattern) and the full auth layer: `csrf`/`me`/`register`/`login`/`logout`/`otp/phone`/
`otp/confirm`/`forget-password`/`change-password`, all verified end to end (Persian
digits, attempt limiting, code reuse rejection, session survival after a password
change). SMS goes through `account/services.py` with an `SMSLog` model in the same app
— no separate `comms` app, since CRM's only messages are auth-related.
`core/permissions.py` carries the `role_permission` factory.

**Steps 3–7 landed the same day:** the `home` app (Customer, CustomerOwner,
Transaction with Persian date columns) with the legacy rows copied across, the
customers and transactions APIs, the frontend auth shell (AuthProvider, route
guards, login/register/OTP/forget-password), and the customers page itself — header,
footer, filter chips, pagination and one modal covering create/edit/delete. Remaining:
step 8 (transactions page) and step 9 (tests, demo data, responsive pass).
`frontend/src/index.css` already carries `grid-customer` and `grid-transaction`, ready
for the future tables.

Planned order (see `.claude/architecture.md` §6): `account` app + migrations → auth
layer → `home` app → customers API → transactions API → frontend screens.

**Why:** the scope was his explicit choice, not an oversight; and the skeleton being
*verified* rather than merely written is what makes the next phases safe to build on.
**How to apply:** don't add domain models or auth speculatively — wait for his
go-ahead. Before phase 1, [[crm-db-access]] must be resolved, since no migration can
run and no query can be tested until then. Also read [[crm-legacy-migrations]] first.
