# CRM — سامانه مدیریت مشتریان

بازنویسی پروژهٔ `CustomerManagement` روی معماری **DRF + React**، هم‌سبک با پروژهٔ SAM.
این مخزن فعلاً فقط **اسکلت** است: پشتهٔ فنی سرِ پا و متصل، بدون اپ دامنه و بدون احراز هویت.

نسخهٔ اصلی روی **WSL Ubuntu** است: `/home/farhad/projects/python/django/CRM`.
نسخهٔ ویندوزی در `D:\Python\Django\CRM` مبدأ همین کپی است و از این پس ثانویه محسوب می‌شود.

## پشتهٔ فنی

| لایه | نسخهٔ این محیط (WSL) |
|---|---|
| Python | 3.14.4 |
| Django | 6.0 + djangorestframework 3.17 |
| Node.js | 24.19 |
| React | 19 + Vite 8 + Tailwind **v4** |
| PostgreSQL | 18.4 (پورت **5433** روی ویندوز — پستگرس ۱۷ روی ۵۴۳۲ است) |

## راه‌اندازی اولیه

```bash
cp .env.example .env
```

سپس مقادیر را پر کنید (به‌ویژه `SECRET_KEY` و `DB_PASSWORD`). بعد:

```bash
python3 -m venv venv && venv/bin/pip install -r requirements.txt
```

```bash
cd frontend && npm install
```

## اجرای روزانه

بک‌اند (ترمینال اول):

```bash
venv/bin/python manage.py runserver 8000
```

فرانت (ترمینال دوم):

```bash
cd frontend && npm run dev
```

سپس مرورگر را روی <http://localhost:5173> باز کنید. **فقط از همین آدرس استفاده کنید** —
Vite درخواست‌های `/api`، `/media`، `/static` و `/django-admin` را به جنگو روی `:8000`
پراکسی می‌کند تا همه‌چیز Same-Origin باشد و کوکی سشن و CSRF بدون CORS کار کنند.

پنل ادمین جنگو: <http://localhost:5173/django-admin/> (مسیر `/admin` متعلق به SPA است، نه جنگو.)

## دیتابیس — نکتهٔ مهم

پروژه به همان دیتابیس **قدیمیِ `CRM`** وصل است؛ همانی که `CustomerManagement` استفاده می‌کند:

```bash
psql -h localhost -p 5433 -U postgres -d CRM
```

> ⚠️ **از داخل WSL این دیتابیس در دسترس نیست.** `.wslconfig` روی `networkingMode=NAT`
> است، پس `localhost`ِ لینوکس همان لوپ‌بکِ ویندوز نیست؛ و اتصال به IP هاست
> (`192.168.0.1`) را فایروال ویندوز drop می‌کند. `manage.py check` سبز می‌ماند ولی هر
> کوئری‌ای می‌شکند. راه‌حل‌ها در `CLAUDE.md`، بخش «دیتابیس — دو تله».

جدول‌های موجود: `account_owner`، `home_customer`، `home_customerowner`، `home_transaction`
و جدول‌های سیستمی جنگو.

> ⚠️ **فعلاً `migrate` نزنید.** جدول `django_migrations` این دیتابیس هنوز تاریخچهٔ
> پروژهٔ قدیمی را دارد و اپ‌های `account` و `home` در آن ثبت شده‌اند. تا وقتی اپ‌های
> دامنه به این پروژه اضافه نشده‌اند، `migrate` وضعیت را خراب می‌کند
> (مثلاً `auth.0001_initial` ثبت شده ولی جدول `auth_user` وجود ندارد، چون پروژهٔ قدیمی
> `AUTH_USER_MODEL = account.Owner` داشت).
>
> برای همین، اپ‌های دامنه باید با **همان نام‌ها** (`account` و `home`) و **همان نام مدل‌ها**
> (`Owner`، `Customer`، `CustomerOwner`، `Transaction`) ساخته شوند و فایل‌های مایگریشن
> پروژهٔ قدیمی هم منتقل شوند تا نام جدول‌ها و تاریخچه بخوانند.

گرفتن پشتیبان پیش از هر تغییر ساختاری:

```bash
pg_dump -h localhost -p 5433 -U postgres -d CRM --no-owner --no-privileges -f backup.sql
```

## ساختار

```
CRM/
├── core/            # تنظیمات، urls، wsgi/asgi
├── api/             # تابلوی راهنمای مسیرهای API (فعلاً فقط /api/health/)
├── static/ media/ templates/
└── frontend/
    ├── public/      # فونت‌های ایران‌سنس و مربا، تصاویر، favicon
    └── src/
        ├── api/client.js          # رَپِر fetch با هندلینگ CSRF
        ├── components/layout/     # RootLayout
        ├── components/common/     # ThemeSwitcher، ProgressToast
        ├── lib/                   # notify، utils
        ├── pages/                 # Home (موقت)، NotFound
        ├── routes.jsx
        └── index.css              # تم Tailwind v4 (CSS-first)
```

## قراردادهایی که زیاد اشتباه می‌شوند

**Tailwind نسخهٔ ۴ و CSS-first است.** هیچ `tailwind.config.js` وجود ندارد و نباید ساخته شود؛
تم در بلاک `@theme` داخل `src/index.css` تعریف شده. دارک‌مود مبتنی بر کلاس است با
`@custom-variant dark (&:where(.dark, .dark *))` که باید بلافاصله بعد از `@import` بماند.

**رنگ‌ها شماره‌دارند، نه معنایی.** `--color-var-color-00` تا `49`. رنگ تازه = شمارهٔ بعدی.
قبل از انتخاب رنگ، مقدارش را از `index.css` بخوانید. پرکاربردها: `00`=سفید، `01`=#F9F9F9،
`02`=#e5e7eb (بوردر استاندارد)، `15`=#00bcff (اکسنت)، `35`=پس‌زمینهٔ دارک، `36/37`=سطوح دارک،
`38`=بوردر دارک، `49`=پس‌زمینهٔ لایتِ پنل.

**RTL دو تله دارد:**
- در فلکس، `mr-auto` عنصر را به **چپ** می‌برد و `ml-auto` به **راست** — برعکسِ شهود.
  برای «انتهای خط» در RTL همیشه `mr-auto`.
- ترتیب DOM برعکس دیده می‌شود: اولین فرزند، راست‌ترین است.

**`:hover` روی دکمهٔ `disabled` هم اعمال می‌شود.** برای دکمه‌های شرطی `enabled:hover:...` بنویسید.

**کامنت JSX بین صفت‌های یک عنصر نامعتبر است** — بالای عنصر بگذارید.

## قبل از هر کامیت

```bash
cd frontend && npx eslint src/ && npm run build
```

```bash
venv/bin/python manage.py check
```
