# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

آخرین تولید: 2026-08-20 19:31 · کامیت `86f6e23`

| بخش | فایل | خط |
|---|---|---|
| بک‌اند | 12 | 317 |
| فرانت‌اند | 11 | 472 |

اپ‌های جنگو: api

## endpointها

| مسیر | ویو | فایل:خط | مجوز |
|---|---|---|---|
| `/api/health/` | HealthView | api/views.py:7 | [AllowAny] |

## مدل‌ها

_هنوز مدلی تعریف نشده است._

## ماژول‌های بک‌اند

- **./api/apps.py** (5 خط، 1 نماد)
    - `ApiConfig` :4
- **./api/views.py** (15 خط، 2 نماد)
    - `HealthView` :7
- **./manage.py** (22 خط، 1 نماد)
    - `main` :7

## فرانت‌اند

### صفحه‌ها
- **frontend/src/pages/Home/Home.jsx** (59 خط)
- **frontend/src/pages/NotFound/NotFound.jsx** (21 خط)

### کامپوننت‌های مشترک
- `ProgressToast` — 119 خط
- `ThemeSwitcher` — 87 خط

### لایهٔ API
- **client.js**: get post put patch delete

