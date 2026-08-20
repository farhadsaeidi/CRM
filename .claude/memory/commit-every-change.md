---
name: commit-every-change
description: "Commit AND push each finished change yourself, straight to main — CRM has a GitHub remote since 2026-08-20"
metadata:
  node_type: memory
  type: feedback
---

Farhad asked (2026-07-31, on SAM) that every change be committed by me as soon as it
is done, without waiting to be asked each time, and on **2026-08-20 extended that to
CRM including the push**: "از این به بعد هر تغییری که دادی باید توی گیت هاب پوش هم بکنی".
Commit straight to `main` — that is where the history lives and where he commits
himself; do not create a branch.

Remote: `https://github.com/farhadsaeidi/CRM.git` (added 2026-08-20, first push
`7e9b2db`, 5 commits / 69 files). Auth is git's global `credential.helper=store` with
`~/.git-credentials` (mode 600) — the same entry serves SAM and CRM, so no token ever
needs to be typed or handled.

Message style: short imperative English subject ("Scaffold CRM project"), optional
body explaining the reasoning, then the `Co-Authored-By: Claude <noreply@anthropic.com>`
trailer.

**Why:** on SAM, rounds of UI iteration were lost track of because changes piled up
uncommitted, making "revert to N minutes ago" need manual reverse-editing instead of
one git command. The remote is also the only backup outside WSL.

**How to apply:** after finishing and verifying a change, commit **and push** in the
same turn and report the hash. Check `git status` first so unrelated edits he made
himself don't get swept in — stage specific files. Before the push, confirm no secret
is going out: `.env` must stay untracked (it is gitignored and has never been
committed). Stop and ask before anything that rewrites published history (force-push,
rebasing pushed commits).

**Critical gotcha:** run git through `wsl -e env -i HOME=/home/farhad /bin/bash -lc …`.
Plain `env -i` wipes `HOME`, so git cannot read `~/.gitconfig`, never loads the
credential helper, falls back to prompting for a username on non-interactive stdin,
and **hangs forever** — this cost a 7-minute stall before it was diagnosed. See
[[crm-wsl-env]] and [[user-working-style]].
