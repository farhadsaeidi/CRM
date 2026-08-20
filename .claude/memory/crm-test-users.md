---
name: crm-test-users
description: "CRM's 12 demo users have password 123 (not SAM's 1234); login key is `username`=phone; id 1 is the superuser Farhad"
metadata:
  node_type: memory
  type: project
---

The 12 users carried over from `CustomerManagement` all use password **`123`** — not
`1234`, which is SAM's convention. The old project's `settings.py` recorded it in a
comment: `admin panel ---> user: 09177969417  pass: 123`.

- `id 1` — `09177969417` فرهاد سعیدی — role `superuser` (the only one)
- `id 2…12` — role `owner`, phones `09120000000`, `09121111111`, `09122222222`,
  `09123333333` … `09129999999`, `09130000000`

**Why this trips you up:** `09129999999` looks like an obviously fake number to test
the "user does not exist" branch with — but it is a real demo user (محمود احمدی نژاد),
so the API correctly answers "wrong password" and the test looks broken when it isn't.
Use something outside the seeded set, e.g. `09051234567`.

**How to apply:** the login endpoint takes `username` (the phone), not `phone`. Read
phones from the database rather than guessing. Persian/Arabic digits and `+98`/`0098`
prefixes are normalized server-side, so they are fine to send. After `login`, the CSRF
token rotates — re-read the `csrftoken` cookie before the next unsafe request or it
will 403. If a test creates users, clean them up (`DELETE FROM account_myuser WHERE
id > 12`) and reset the identity counter with `setval`. See [[crm-legacy-migrations]].
