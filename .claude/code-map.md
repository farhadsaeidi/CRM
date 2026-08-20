# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

آخرین تولید: 2026-08-20 22:26 · کامیت `48aa4d0`

| بخش | فایل | خط |
|---|---|---|
| بک‌اند | 19 | 631 |
| فرانت‌اند | 11 | 472 |

اپ‌های جنگو: account api

## endpointها

| مسیر | ویو | فایل:خط | مجوز |
|---|---|---|---|
| `/api/auth/csrf/` | CSRFView | account/views.py:48 | [AllowAny] |
| `/api/auth/me/` | MeView | account/views.py:56 | [AllowAny] |
| `/api/auth/register/` | RegisterView | account/views.py:68 | [AllowAny] |
| `/api/auth/login/` | LoginView | account/views.py:108 | [AllowAny] |
| `/api/auth/logout/` | LogoutView | account/views.py:146 | [AllowAny] |
| `/api/health/` | HealthView | api/views.py:7 | [AllowAny] |

## مدل‌ها

- `account.MyUserManager` — 0 فیلد — ./account/models.py:10
- `account.Roles` — 0 فیلد — ./account/models.py:40
- `account.MyUser` — 9 فیلد — ./account/models.py:45

## ماژول‌های بک‌اند

- **./account/admin.py** (10 خط، 1 نماد)
    - `MyUserAdmin` :6
- **./account/apps.py** (5 خط، 1 نماد)
    - `AccountConfig` :4
- **./account/models.py** (91 خط، 11 نماد)
    - `MyUserManager` :10
    - `upload_file` :29
    - `Roles` :40
    - `MyUser` :45
- **./account/serializers.py** (15 خط، 2 نماد)
    - `UserSerializer` :8
- **./account/views.py** (154 خط، 13 نماد)
    - `normalize_digits` :23
    - `normalize_phone_number` :30
    - `is_valid_iranian_mobile` :38
    - `CSRFView` :48
    - `MeView` :56
    - `RegisterView` :68
    - `LoginView` :108
    - `LogoutView` :146
- **./api/apps.py** (5 خط، 1 نماد)
    - `ApiConfig` :4
- **./api/views.py** (15 خط، 2 نماد)
    - `HealthView` :7
- **./core/permissions.py** (22 خط، 3 نماد)
    - `role_permission` :5
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

