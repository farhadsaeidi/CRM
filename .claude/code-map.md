# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

آخرین تولید: 2026-08-25 16:42 · کامیت `76fc0d7`

| بخش | فایل | خط |
|---|---|---|
| بک‌اند | 40 | 3578 |
| فرانت‌اند | 82 | 7617 |

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
| `/api/dashboard/` | DashboardView | home/views.py:123 | _(پیش‌فرض DRF)_ |
| `/api/customers/` | CustomerListCreateView | home/views.py:56 | _(پیش‌فرض DRF)_ |
| `/api/customers/stats/` | CustomerStatsView | home/views.py:93 | _(پیش‌فرض DRF)_ |
| `/api/customers/<int:pk>/` | CustomerDetailView | home/views.py:104 | _(پیش‌فرض DRF)_ |
| `/api/transactions/` | AllTransactionsView | home/views.py:148 | _(پیش‌فرض DRF)_ |
| `/api/transactions/search/` | AllTransactionsSearchView | home/views.py:184 | _(پیش‌فرض DRF)_ |
| `/api/transactions/stats/` | AllTransactionsStatsView | home/views.py:177 | _(پیش‌فرض DRF)_ |
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
- **./account/tests.py** (221 خط، 27 نماد)
    - `RegisterLoginTests` :21
    - `OtpTests` :95
    - `PasswordTests` :171
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
- **./home/dashboard.py** (533 خط، 21 نماد)
    - `_today_jalali` :52
    - `_shift_month` :56
    - `_period_queries` :62
    - `_delta_percent` :98
    - `_sums` :105
    - `_collection_rate` :111
    - `_kpis` :120
    - `_trend` :147
    - `_customer_rows` :182
    - `_days_since` :201
    - `_customer_tiles` :205
    - `_aging` :276
    - `_concentration` :293
    - `_recent` :310
- **./home/management/commands/seed_demo.py** (174 خط، 7 نماد)
    - `Command` :50
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
- **./home/tests/factories.py** (68 خط، 6 نماد)
    - `next_phone` :18
    - `make_owner` :22
    - `make_customer` :31
    - `jalali_to_datetime` :42
    - `make_transaction` :53
    - `today_jalali` :67
- **./home/tests/test_customers_api.py** (125 خط، 16 نماد)
    - `CustomerListTests` :11
    - `CustomerWriteTests` :62
- **./home/tests/test_scoping.py** (167 خط، 18 نماد)
    - `ScopingTests` :18
    - `AuthenticationRequiredTests` :140
- **./home/tests/test_seed_demo.py** (86 خط، 11 نماد)
    - `SeedDemoTests` :18
- **./home/tests/test_services.py** (96 خط، 17 نماد)
    - `AccountCodeTests` :19
    - `RemainderTests` :26
    - `DateSearchQueryTests` :60
- **./home/tests/test_stats_api.py** (193 خط، 25 نماد)
    - `DashboardTests` :14
    - `CustomerStatsTests` :125
    - `TransactionStatsTests` :151
- **./home/tests/test_transactions_api.py** (180 خط، 32 نماد)
    - `LedgerTests` :11
    - `DateSearchTests` :82
    - `AllTransactionsTests` :132
- **./home/views.py** (334 خط، 35 نماد)
    - `CustomerPagination` :30
    - `OwnerScopedMixin` :39
    - `CustomerListCreateView` :56
    - `CustomerStatsView` :93
    - `CustomerDetailView` :104
    - `DashboardView` :123
    - `AllTransactionsPagination` :137
    - `AllTransactionsView` :148
    - `AllTransactionsStatsView` :177
    - `AllTransactionsSearchView` :184
    - `TransactionListCreateView` :212
    - `TransactionDetailView` :266
    - `TransactionStatsView` :294
    - `TransactionSearchView` :307
- **./manage.py** (22 خط، 1 نماد)
    - `main` :7

## فرانت‌اند

### صفحه‌ها
- **frontend/src/pages/Chat/Chat.jsx** (83 خط)
    - Breadcrumb
    - ChatPane
    - ChatSidebar
    - Sidebar
- **frontend/src/pages/Customers/CustomerLedger.jsx** (41 خط)
    - Breadcrumb
    - LedgerKpis
    - TransactionsTable
- **frontend/src/pages/Customers/Customers.jsx** (40 خط)
    - Breadcrumb
    - CustomerKpis
    - CustomersTable
- **frontend/src/pages/Home/Home.jsx** (43 خط)
    - HomeSidebar
    - Sidebar
- **frontend/src/pages/NotFound/NotFound.jsx** (27 خط)
- **frontend/src/pages/Transactions/Transactions.jsx** (460 خط)
    - Breadcrumb
    - CustomTooltip
    - Footer
    - MenuItem
    - RowSelectMark
    - ScrollContainer
    - TransactionKpis
    - notify

### کامپوننت‌های مشترک
- `Breadcrumb` — 72 خط
- `ChangePasswordModal` — 180 خط
- `CustomTooltip` — 54 خط
- `Footer` — 425 خط
- `Header` — 42 خط
- `KpiCard` — 116 خط
- `LogoIcon` — 28 خط
- `MenuItem` — 34 خط
- `ModalActions` — 53 خط
- `ModalCloseButton` — 30 خط
- `Pagination` — 77 خط
- `ProgressToast` — 119 خط
- `RowSelectMark` — 33 خط
- `ScrollContainer` — 115 خط
- `Sidebar` — 76 خط
- `ThemeSwitcher` — 87 خط
- `WindowsIcon` — 37 خط

### لایهٔ API
- **auth.js**: me login register otpPhone otpConfirm forgetPassword changePassword logout

- **client.js**: get post put patch delete

- **customers.js**: list stats create update remove

- **dashboard.js**: get

- **transactions.js**: list stats search create update remove list stats search

