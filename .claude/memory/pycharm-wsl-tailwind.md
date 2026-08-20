---
name: pycharm-wsl-tailwind
description: PyCharm runs on Windows while CRM lives in WSL; Tailwind v4 LSP needs experimental.configFile set manually or it reports false cssConflict warnings
metadata:
  node_type: memory
  type: project
---

PyCharm (2025.3, Windows install) opens WSL projects over the WSL bridge, so the
Tailwind language server cannot auto-detect the v4 CSS entry file. Without help it
ignores `@theme` and `@custom-variant`, so `var-color-*` colors show no swatches and
every `bg-var-color-00 dark:bg-var-color-36` pair raises a false `cssConflict`
warning ("applies the same CSS properties as").

Fix — `Settings → Languages & Frameworks → Style Sheets → Tailwind CSS`, in the
language-server JSON:

```json
"experimental": { "configFile": "frontend/src/index.css", "classRegex": [] }
```

This is a root-cause fix, not a suppression: `lint.cssConflict` stays `"warning"` and
still catches real conflicts. Do NOT instead set `cssConflict: "ignore"` — that hides
real conflicts and leaves colors unrecognized.

**Why:** it looks like a code bug but is purely environmental — opening the Windows
copy at `D:\Python\Django\CRM` in the same PyCharm shows no warning.
**How to apply:** re-apply after a PyCharm reinstall or on another machine; it is an
IDE setting, not stored in the repo, and irrelevant to deployment. Tailwind v4 here is
CSS-first — there is deliberately no `tailwind.config.js` and no `@config`; do not add
one to "fix" the IDE. Remote Development → WSL would fix detection natively, but on
this machine the JetBrains backend download fails (HTTP 451 geo-block) and WSL is in
NAT mode so it cannot use the Windows localhost proxy — see [[crm-db-access]] and
[[crm-wsl-env]].
