# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

آخرین تولید: 2026-08-24 10:38 · کامیت `9af8806`

| بخش | فایل | خط |
|---|---|---|
| بک‌اند | 27 | 1676 |
| فرانت‌اند | 62 | 5851 |

اپ‌های جنگو: account api home

## endpointها

| مسیر | ویو | فایل:خط | مجوز |
|---|---|---|---|
| `/api/auth/csrf/` | CSRFView | account/views.py:79 | [AllowAny] |
| `/api/auth/me/` | MeView | account/views.py:87 | [AllowAny] |
| `/api/auth/register/` | RegisterView | account/views.py:99 | [AllowAny] |
| `/api/auth/login/` | LoginView | account/views.py:144 | [AllowAny] |
| `/api/auth/logout/` | LogoutView | account/views.py:345 | [AllowAny] |
| `/api/auth/otp/phone/` | OtpPhoneView | account/views.py:182 | [AllowAny] |
| `/api/auth/otp/confirm/` | OtpConfirmView | account/views.py:229 | [AllowAny] |
| `/api/auth/forget-password/` | ForgetPasswordView | account/views.py:290 | [AllowAny] |
| `/api/auth/change-password/` | ChangePasswordView | account/views.py:325 | _(پیش‌فرض DRF)_ |
| `/api/customers/` | CustomerListCreateView | home/views.py:49 | _(پیش‌فرض DRF)_ |
| `/api/customers/<int:pk>/` | CustomerDetailView | home/views.py:85 | _(پیش‌فرض DRF)_ |
| `/api/transactions/` | AllTransactionsView | home/views.py:114 | _(پیش‌فرض DRF)_ |
| `/api/transactions/search/` | AllTransactionsSearchView | home/views.py:142 | _(پیش‌فرض DRF)_ |
| `/api/health/` | HealthView | api/views.py:7 | [AllowAny] |

## مدل‌ها

- `account.MyUserManager` — 0 فیلد — ./account/models.py:10
- `account.Roles` — 0 فیلد — ./account/models.py:40
- `account.MyUser` — 10 فیلد — ./account/models.py:45
- `account.SMSLog` — 6 فیلد — ./account/models.py:97
- `home.AccountCode` — 0 فیلد — ./home/models.py:7
- `home.Customer` — 5 فیلد — ./home/models.py:17
- `home.CustomerOwner` — 3 فیلد — ./home/models.py:55
- `home.Transaction` — 8 فیلد — ./home/models.py:71

## ماژول‌های بک‌اند

- **./account/admin.py** (22 خط، 3 نماد)
    - `MyUserAdmin` :6
    - `SMSLogAdmin` :14
- **./account/apps.py** (5 خط، 1 نماد)
    - `AccountConfig` :4
- **./account/models.py** (128 خط، 15 نماد)
    - `MyUserManager` :10
    - `upload_file` :29
    - `Roles` :40
    - `MyUser` :45
    - `SMSLog` :97
- **./account/serializers.py** (15 خط، 2 نماد)
    - `UserSerializer` :8
- **./account/services.py** (112 خط، 8 نماد)
    - `OtpSendError` :19
    - `_dev_mode` :28
    - `_api_key` :32
    - `_run_with_timeout` :36
    - `send_sms` :45
    - `send_token_sms` :65
- **./account/views.py** (353 خط، 24 نماد)
    - `normalize_digits` :35
    - `to_persian_digits` :42
    - `generate_otp_code` :47
    - `get_otp_remaining_seconds` :53
    - `normalize_phone_number` :61
    - `is_valid_iranian_mobile` :69
    - `CSRFView` :79
    - `MeView` :87
    - `RegisterView` :99
    - `LoginView` :144
    - `OtpPhoneView` :182
    - `OtpConfirmView` :229
    - `ForgetPasswordView` :290
    - `ChangePasswordView` :325
- **./api/apps.py** (5 خط، 1 نماد)
    - `ApiConfig` :4
- **./api/views.py** (15 خط، 2 نماد)
    - `HealthView` :7
- **./core/permissions.py** (22 خط، 3 نماد)
    - `role_permission` :5
- **./home/admin.py** (26 خط، 3 نماد)
    - `CustomerAdmin` :6
    - `CustomerOwnerAdmin` :14
    - `TransactionAdmin` :22
- **./home/apps.py** (5 خط، 1 نماد)
    - `HomeConfig` :4
- **./home/models.py** (110 خط، 12 نماد)
    - `AccountCode` :7
    - `Customer` :17
    - `CustomerOwner` :55
    - `Transaction` :71
- **./home/serializers.py** (88 خط، 11 نماد)
    - `normalize_phone_number` :12
    - `PhoneField` :18
    - `CustomerSerializer` :29
    - `AllTransactionsSerializer` :57
    - `TransactionSerializer` :73
- **./home/services.py** (144 خط، 7 نماد)
    - `account_code_from_remainder` :16
    - `calculate_remainder` :24
    - `recalculate_account` :37
    - `build_period_query` :57
    - `_to_int` :85
    - `_field_query` :95
    - `build_date_search_query` :133
- **./home/views.py** (280 خط، 27 نماد)
    - `CustomerPagination` :23
    - `OwnerScopedMixin` :32
    - `CustomerListCreateView` :49
    - `CustomerDetailView` :85
    - `AllTransactionsPagination` :103
    - `AllTransactionsView` :114
    - `AllTransactionsSearchView` :142
    - `TransactionListCreateView` :170
    - `TransactionDetailView` :224
    - `TransactionSearchView` :253
- **./manage.py** (22 خط، 1 نماد)
    - `main` :7

## فرانت‌اند

### صفحه‌ها
- **frontend/src/pages/Chat/Chat.jsx** (79 خط)
    - Breadcrumb
    - ChatPane
    - ChatSidebar
    - Sidebar
- **frontend/src/pages/Customers/CustomerLedger.jsx** (40 خط)
    - Breadcrumb
    - TransactionsTable
- **frontend/src/pages/Customers/Customers.jsx** (23 خط)
    - Breadcrumb
    - CustomersTable
- **frontend/src/pages/Home/Home.jsx** (25 خط)
    - HomeSidebar
    - Sidebar
- **frontend/src/pages/NotFound/NotFound.jsx** (23 خط)
- **frontend/src/pages/Transactions/Transactions.jsx** (417 خط)
    - Breadcrumb
    - CustomTooltip
    - Footer
    - MenuItem
    - RowSelectMark
    - ScrollContainer
    - notify

### کامپوننت‌های مشترک
- `Breadcrumb` — 71 خط
- `ChangePasswordModal` — 180 خط
- `CustomTooltip` — 54 خط
- `Footer` — 425 خط
- `Header` — 45 خط
- `LogoIcon` — 28 خط
- `MenuItem` — 34 خط
- `ModalActions` — 53 خط
- `ModalCloseButton` — 30 خط
- `Pagination` — 77 خط
- `ProgressToast` — 119 خط
- `RowSelectMark` — 33 خط
- `ScrollContainer` — 111 خط
- `Sidebar` — 76 خط
- `ThemeSwitcher` — 87 خط
- `WindowsIcon` — 37 خط

### لایهٔ API
- **auth.js**: me login register otpPhone otpConfirm forgetPassword changePassword logout

- **client.js**: get post put patch delete

- **customers.js**: list create update remove

- **transactions.js**: list search create update remove list search

