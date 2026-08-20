---
name: user-working-style
description: "Farhad wants a rock-solid base: fix clear bugs autonomously without asking, and explain the root cause because he is learning-oriented"
metadata:
  node_type: memory
  type: feedback
---

While building the foundation of a project, Farhad wants the base to be rock-solid
("محکم") and prefers I **fix clear bugs and fragilities autonomously without stopping
to ask for confirmation**. Quote (from the SAM foundation phase): "اگه باگی وجود داره،
بدون اینکه سوال بپرسی خودت برطرفش کن. پروژه تازه شروع شده. میخوام پایه و بیس پروژه محکم
باشه." The same stance applies to CRM, which is at the same early stage.

**Why:** the project is at an early stage; he is investing in a robust base and trusts
me to harden it rather than defer every decision back to him.
**How to apply:** when I spot a clear bug or a real fragility, fix it and verify
end-to-end, then report what I did — don't ask first. Reserve questions for genuinely
ambiguous design trade-offs (as with the database and scope decisions in
[[crm-project-brief]]), not for clear fixes. He writes heavy explanatory Persian
comments in his code and is learning-oriented, so explain the root cause and the
reasoning, not just the change. Keep code comments Persian and about *why*.
