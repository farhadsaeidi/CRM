---
name: commit-every-change
description: "Commit each finished change yourself, straight to main, without being asked — CRM has no remote yet, so nothing to push"
metadata:
  node_type: memory
  type: feedback
---

Farhad asked (2026-07-31, on SAM) that every change be committed by me as soon as it
is done, without waiting to be asked each time. Commit straight to `main` — that is
where the history lives and where he commits himself; do not create a branch.

Message style: short imperative English subject ("Scaffold CRM project",
"Remove tailwind.config.js"), optional body explaining the reasoning, then the
`Co-Authored-By: Claude <noreply@anthropic.com>` trailer.

**Why:** on SAM, several rounds of UI iteration were lost track of because changes
piled up uncommitted, which made "revert to N minutes ago" requests need manual
reverse-editing instead of a one-line git command. Committing each step makes those
rollbacks trivial and keeps history readable.

**How to apply:** after finishing and verifying a change, commit in the same turn and
report the hash. Check `git status` first so unrelated edits he made himself don't get
swept in — stage specific files. **Unlike SAM, CRM has no git remote** (SAM pushes to
`github.com/farhadsaeidi/SAM`); do not create or add one without asking, and there is
nothing to push. Stop and ask before anything that rewrites published history.
See [[user-working-style]] and [[crm-wsl-env]] for which copy to commit from.
