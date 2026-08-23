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

## تاییدها و سرورها — ۲۰۲۶-۰۸-۲۳

**سرورهای توسعه را نه اجرا کن نه ببند.** `npm run dev` و `runserver` را خودش بالا
نگه می‌دارد. بستنِ پورت ۵۱۷۳ یا ۸۰۰۰ (حتی برای «پاکسازی») یعنی او باید دوباره
دستی راه‌اندازی کند. نقلِ خودش: «هر بار که تغییر ایجاد میکنی حتما باید سرورها رو
ببندی؟ … اینجوری من مجبورم هر بار سرور ها رو ران کنم و پای سیستم برای تائید بشینم
که جالب نیست.»

**از ابزار مرورگر استفاده نکن.** هر فراخوانی یک پرامپتِ تایید می‌سازد که او باید
پای سیستم بنشیند و بزند. تاییدِ تغییرات فرانت با همان چیزی است که در گام‌های ۷ و ۸
جواب داد: `npx eslint src/` و `npm run build` و در صورت نیاز grep روی CSS خروجی در
`frontend/dist/assets/*.css`.

**Why:** او پشتِ سیستم نمی‌نشیند تا تاییدهای پیاپی بدهد؛ کارِ نیمه‌خودکار برایش
بدتر از کارِ بدونِ تاییدِ بصری است.

**How to apply:** ویرایش کن، لینت و بیلد بگیر، کامیت و پوش کن، و اگر چیزی را
نمی‌توانی بدونِ دیدن تایید کنی همان را صریح بگو — به‌جای اینکه محیطش را دست بزنی.
سه بار در همین سشن این خط را رد کردم و باید تکرار نشود.
