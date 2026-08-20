# Memory Index

- [CRM project brief](crm-project-brief.md) — DRF+React rewrite of CustomerManagement, modeled on SAM, keeping the old database; Farhad directs each phase
- [CRM skeleton state](crm-skeleton-state.md) — verified bare skeleton as of 2026-08-20; no domain apps, no auth; planned build order

- [CRM database access](crm-db-access.md) — live DB moved to **Linux PG 18 on 5434**; a stale twin remains on Windows 5433 and connecting to it fails silently; cluster needs a manual start after WSL restarts
- [CRM legacy migrations](crm-legacy-migrations.md) — never run `migrate` yet; new apps must reuse `account`/`home` + `Owner`/`Customer`/`CustomerOwner`/`Transaction` names
- [CRM WSL environment](crm-wsl-env.md) — live copy is in WSL; venv is `venv/` not `.venv/`; calling wsl from Git Bash needs `MSYS_NO_PATHCONV=1`
- [PyCharm + WSL + Tailwind](pycharm-wsl-tailwind.md) — Windows PyCharm over the WSL bridge can't auto-find the v4 CSS entry; set `experimental.configFile` or get false cssConflict warnings

- [User working style](user-working-style.md) — fix clear bugs autonomously without asking; explain root causes, Persian comments about *why*
- [Commit every change](commit-every-change.md) — commit each finished change yourself, straight to main; CRM has no remote, so nothing to push
