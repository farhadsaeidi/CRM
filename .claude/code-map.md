# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

آخرین تولید: 2026-09-22 03:25 · کامیت `1227a43`

| بخش | فایل | خط |
|---|---|---|
| بک‌اند | 120 | 16859 |
| فرانت‌اند | 124 | 12258 |

اپ‌های جنگو: account api chat home

## endpointها

| مسیر | ویو | فایل:خط | مجوز |
|---|---|---|---|
| `/api/auth/csrf/` | CSRFView | account/views.py:81 | [AllowAny] |
| `/api/auth/me/` | MeView | account/views.py:89 | [AllowAny] |
| `/api/auth/register/` | RegisterView | account/views.py:101 | [AllowAny] |
| `/api/auth/login/` | LoginView | account/views.py:141 | [AllowAny] |
| `/api/auth/logout/` | LogoutView | account/views.py:363 | [AllowAny] |
| `/api/auth/otp/phone/` | OtpPhoneView | account/views.py:179 | [AllowAny] |
| `/api/auth/otp/confirm/` | OtpConfirmView | account/views.py:227 | [AllowAny] |
| `/api/auth/forget-password/` | ForgetPasswordView | account/views.py:288 | [AllowAny] |
| `/api/auth/profile/` | ProfileView | account/views.py:325 | _(پیش‌فرض DRF)_ |
| `/api/auth/change-password/` | ChangePasswordView | account/views.py:343 | _(پیش‌فرض DRF)_ |
| `/api/dashboard/` | DashboardView | home/views.py:195 | _(پیش‌فرض DRF)_ |
| `/api/statement/` | StatementView | home/views.py:126 | _(پیش‌فرض DRF)_ |
| `/api/reminders/debtors/` | DebtorReminderListView | home/views.py:155 | _(پیش‌فرض DRF)_ |
| `/api/reminders/send/` | DebtorReminderSendView | home/views.py:163 | _(پیش‌فرض DRF)_ |
| `/api/export/xlsx/` | ExcelExportView | home/views.py:137 | _(پیش‌فرض DRF)_ |
| `/api/customers/` | CustomerListCreateView | home/views.py:59 | _(پیش‌فرض DRF)_ |
| `/api/customers/stats/` | CustomerStatsView | home/views.py:96 | _(پیش‌فرض DRF)_ |
| `/api/customers/<int:pk>/` | CustomerDetailView | home/views.py:107 | _(پیش‌فرض DRF)_ |
| `/api/transactions/` | AllTransactionsView | home/views.py:220 | _(پیش‌فرض DRF)_ |
| `/api/transactions/search/` | AllTransactionsSearchView | home/views.py:256 | _(پیش‌فرض DRF)_ |
| `/api/transactions/stats/` | AllTransactionsStatsView | home/views.py:249 | _(پیش‌فرض DRF)_ |
| `/api/chat/models/` | ModelListView | chat/views.py:64 | [IsOwner] |
| `/api/chat/query/` | UiQueryView | chat/views.py:78 | [IsOwner] |
| `/api/chat/conversations/` | ConversationListCreateView | chat/views.py:40 | _(پیش‌فرض DRF)_ |
| `/api/chat/conversations/<int:pk>/` | ConversationDetailView | chat/views.py:52 | _(پیش‌فرض DRF)_ |
| `/api/chat/conversations/<int:pk>/messages/` | MessageCreateView | chat/views.py:115 | _(پیش‌فرض DRF)_ |
| `/api/chat/conversations/<int:pk>/stream/` | MessageStreamView | chat/views.py:271 | _(پیش‌فرض DRF)_ |
| `/api/chat/conversations/<int:pk>/rewind/` | MessageRewindView | chat/views.py:191 | _(پیش‌فرض DRF)_ |
| `/api/chat/conversations/<int:pk>/fork/` | MessageForkView | chat/views.py:216 | _(پیش‌فرض DRF)_ |
| `/api/health/` | HealthView | api/views.py:7 | [AllowAny] |

## مدل‌ها

- `.claude.MyUserManager` — 0 فیلد — ./.claude/worktrees/laughing-davinci-da5628/account/models.py:10
- `.claude.Roles` — 0 فیلد — ./.claude/worktrees/laughing-davinci-da5628/account/models.py:40
- `.claude.MyUser` — 11 فیلد — ./.claude/worktrees/laughing-davinci-da5628/account/models.py:45
- `.claude.SMSLog` — 6 فیلد — ./.claude/worktrees/laughing-davinci-da5628/account/models.py:103
- `.claude.Conversation` — 5 فیلد — ./.claude/worktrees/laughing-davinci-da5628/chat/models.py:6
- `.claude.Message` — 7 فیلد — ./.claude/worktrees/laughing-davinci-da5628/chat/models.py:46
- `.claude.AccountCode` — 0 فیلد — ./.claude/worktrees/laughing-davinci-da5628/home/models.py:7
- `.claude.Customer` — 5 فیلد — ./.claude/worktrees/laughing-davinci-da5628/home/models.py:17
- `.claude.CustomerOwner` — 3 فیلد — ./.claude/worktrees/laughing-davinci-da5628/home/models.py:55
- `.claude.Transaction` — 8 فیلد — ./.claude/worktrees/laughing-davinci-da5628/home/models.py:71
- `account.MyUserManager` — 0 فیلد — ./account/models.py:10
- `account.Roles` — 0 فیلد — ./account/models.py:40
- `account.MyUser` — 11 فیلد — ./account/models.py:45
- `account.SMSLog` — 6 فیلد — ./account/models.py:103
- `chat.Conversation` — 5 فیلد — ./chat/models.py:6
- `chat.Message` — 7 فیلد — ./chat/models.py:46
- `home.AccountCode` — 0 فیلد — ./home/models.py:7
- `home.Customer` — 5 فیلد — ./home/models.py:17
- `home.CustomerOwner` — 3 فیلد — ./home/models.py:55
- `home.Transaction` — 8 فیلد — ./home/models.py:71

## ماژول‌های بک‌اند

- **./.claude/worktrees/laughing-davinci-da5628/account/admin.py** (22 خط، 3 نماد)
    - `MyUserAdmin` :6
    - `SMSLogAdmin` :14
- **./.claude/worktrees/laughing-davinci-da5628/account/apps.py** (5 خط، 1 نماد)
    - `AccountConfig` :4
- **./.claude/worktrees/laughing-davinci-da5628/account/models.py** (134 خط، 15 نماد)
    - `MyUserManager` :10
    - `upload_file` :29
    - `Roles` :40
    - `MyUser` :45
    - `SMSLog` :103
- **./.claude/worktrees/laughing-davinci-da5628/account/serializers.py** (39 خط، 4 نماد)
    - `UserSerializer` :8
    - `ProfileUpdateSerializer` :18
- **./.claude/worktrees/laughing-davinci-da5628/account/services.py** (128 خط، 9 نماد)
    - `OtpSendError` :19
    - `_dev_mode` :28
    - `_api_key` :32
    - `_run_with_timeout` :36
    - `_delivery_target` :45
    - `send_sms` :56
    - `send_token_sms` :76
- **./.claude/worktrees/laughing-davinci-da5628/account/tests.py** (398 خط، 52 نماد)
    - `RegisterLoginTests` :23
    - `OtpTests` :95
    - `PasswordTests` :171
    - `ProfileTests` :231
    - `BusinessNameTests` :297
    - `SmsDeliveryTargetTests` :336
    - `DevTrustedOriginsTests` :381
- **./.claude/worktrees/laughing-davinci-da5628/account/views.py** (371 خط، 26 نماد)
    - `normalize_digits` :37
    - `to_persian_digits` :44
    - `generate_otp_code` :49
    - `get_otp_remaining_seconds` :55
    - `normalize_phone_number` :63
    - `is_valid_iranian_mobile` :71
    - `CSRFView` :81
    - `MeView` :89
    - `RegisterView` :101
    - `LoginView` :141
    - `OtpPhoneView` :179
    - `OtpConfirmView` :227
    - `ForgetPasswordView` :288
    - `ProfileView` :325
- **./.claude/worktrees/laughing-davinci-da5628/api/apps.py** (5 خط، 1 نماد)
    - `ApiConfig` :4
- **./.claude/worktrees/laughing-davinci-da5628/api/views.py** (15 خط، 2 نماد)
    - `HealthView` :7
- **./.claude/worktrees/laughing-davinci-da5628/chat/admin.py** (26 خط، 3 نماد)
    - `MessageInline` :6
    - `ConversationAdmin` :14
    - `MessageAdmin` :22
- **./.claude/worktrees/laughing-davinci-da5628/chat/apps.py** (5 خط، 1 نماد)
    - `ChatConfig` :4
- **./.claude/worktrees/laughing-davinci-da5628/chat/catalog.py** (72 خط، 3 نماد)
    - `default_model` :39
    - `resolve` :48
    - `choices` :61
- **./.claude/worktrees/laughing-davinci-da5628/chat/engine.py** (702 خط، 16 نماد)
    - `is_fallback` :90
    - `_has_numbers` :103
    - `EngineNotConfigured` :142
    - `EngineError` :146
    - `is_configured` :150
    - `_proxies` :158
    - `_call_model` :181
    - `_merge_tool_deltas` :213
    - `_stream_model` :238
    - `_rescue_tool_calls` :318
    - `_looks_machine` :374
    - `_rescue_bare_call` :392
    - `_rescued` :422
    - `_history` :438
- **./.claude/worktrees/laughing-davinci-da5628/chat/models.py** (88 خط، 8 نماد)
    - `Conversation` :6
    - `Message` :46
- **./.claude/worktrees/laughing-davinci-da5628/chat/serializers.py** (42 خط، 7 نماد)
    - `MessageSerializer` :7
    - `ConversationSerializer` :14
    - `ConversationDetailSerializer` :38
- **./.claude/worktrees/laughing-davinci-da5628/chat/suggestions.py** (129 خط، 2 نماد)
    - `build_suggestions` :86
- **./.claude/worktrees/laughing-davinci-da5628/chat/test_engine.py** (426 خط، 51 نماد)
    - `say` :26
    - `call` :31
    - `ToolScopingTests` :38
    - `EngineLoopTests` :132
    - `RescueTests` :283
    - `MachineOutputTests` :345
    - `ProxyTests` :386
    - `NotConfiguredTests` :420
- **./.claude/worktrees/laughing-davinci-da5628/chat/test_stream.py** (243 خط، 27 نماد)
    - `stream_of` :31
    - `tool_call` :43
    - `StreamLoopTests` :49
    - `StreamEncodingTests` :117
    - `ToolDeltaMergeTests` :150
    - `SuggestionTests` :182
- **./.claude/worktrees/laughing-davinci-da5628/chat/test_widgets.py** (205 خط، 26 نماد)
    - `widget_for` :24
    - `WidgetBuilderTests` :30
    - `WidgetStreamTests` :117
    - `WidgetPersistenceTests` :161
- **./.claude/worktrees/laughing-davinci-da5628/chat/tests.py** (368 خط، 49 نماد)
    - `ConversationCrudTests` :19
    - `MessageTests` :89
    - `ScopingTests` :179
    - `ModelPickerTests` :215
    - `RewindAndForkTests` :287
- **./.claude/worktrees/laughing-davinci-da5628/chat/tools.py** (397 خط، 17 نماد)
    - `_customers_of` :35
    - `_clamp` :39
    - `_jalali` :43
    - `_transaction_row` :62
    - `has_data` :80
    - `tool_overview` :95
    - `tool_customer_summary` :115
    - `tool_transaction_summary` :120
    - `tool_debtors` :125
    - `tool_find_customer` :140
    - `tool_customer_ledger` :161
    - `tool_recent_transactions` :177
    - `tool_customer_transactions` :190
    - `tool_best_payers` :209
- **./.claude/worktrees/laughing-davinci-da5628/chat/views.py** (354 خط، 24 نماد)
    - `OwnerScopedMixin` :26
    - `ConversationListCreateView` :39
    - `ConversationDetailView` :51
    - `ModelListView` :63
    - `_apply_model` :76
    - `MessageCreateView` :90
    - `MessageActionMixin` :148
    - `MessageRewindView` :166
    - `MessageForkView` :191
    - `_sse` :236
    - `MessageStreamView` :246
- **./.claude/worktrees/laughing-davinci-da5628/chat/widgets.py** (308 خط، 15 نماد)
    - `_status` :36
    - `_book_balance` :48
    - `_customer_id` :64
    - `_overview` :79
    - `_customer_summary` :95
    - `_transaction_summary` :112
    - `_debtors` :128
    - `_find_customer` :151
    - `_customer_ledger` :178
    - `_transaction_rows` :205
    - `_recent_transactions` :213
    - `_customer_transactions` :225
    - `_best_payers` :240
    - `_dormant_customers` :258
- **./.claude/worktrees/laughing-davinci-da5628/core/permissions.py** (22 خط، 3 نماد)
    - `role_permission` :5
- **./.claude/worktrees/laughing-davinci-da5628/core/settings.py** (322 خط، 1 نماد)
    - `_local_ipv` :195
- **./.claude/worktrees/laughing-davinci-da5628/home/admin.py** (26 خط، 3 نماد)
    - `CustomerAdmin` :6
    - `CustomerOwnerAdmin` :14
    - `TransactionAdmin` :22
- **./.claude/worktrees/laughing-davinci-da5628/home/apps.py** (5 خط، 1 نماد)
    - `HomeConfig` :4
- **./.claude/worktrees/laughing-davinci-da5628/home/dashboard.py** (533 خط، 21 نماد)
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
- **./.claude/worktrees/laughing-davinci-da5628/home/management/commands/seed_demo.py** (174 خط، 7 نماد)
    - `Command` :50
- **./.claude/worktrees/laughing-davinci-da5628/home/models.py** (110 خط، 12 نماد)
    - `AccountCode` :7
    - `Customer` :17
    - `CustomerOwner` :55
    - `Transaction` :71
- **./.claude/worktrees/laughing-davinci-da5628/home/reminders.py** (125 خط، 3 نماد)
    - `format_amount` :25
    - `build_debtor_list` :34
    - `send_reminders` :87
- **./.claude/worktrees/laughing-davinci-da5628/home/reports.py** (188 خط، 4 نماد)
    - `_today` :30
    - `build_statement` :36
    - `_write_sheet` :101
    - `build_workbook` :144
- **./.claude/worktrees/laughing-davinci-da5628/home/serializers.py** (88 خط، 11 نماد)
    - `normalize_phone_number` :12
    - `PhoneField` :18
    - `CustomerSerializer` :29
    - `AllTransactionsSerializer` :57
    - `TransactionSerializer` :73
- **./.claude/worktrees/laughing-davinci-da5628/home/services.py** (144 خط، 7 نماد)
    - `account_code_from_remainder` :16
    - `calculate_remainder` :24
    - `recalculate_account` :37
    - `build_period_query` :57
    - `_to_int` :85
    - `_field_query` :95
    - `build_date_search_query` :133
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/factories.py** (68 خط، 6 نماد)
    - `next_phone` :18
    - `make_owner` :22
    - `make_customer` :31
    - `jalali_to_datetime` :42
    - `make_transaction` :53
    - `today_jalali` :67
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_customers_api.py** (125 خط، 16 نماد)
    - `CustomerListTests` :11
    - `CustomerWriteTests` :62
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_reminders.py** (164 خط، 23 نماد)
    - `DebtorListTests` :20
    - `ReminderSendTests` :82
    - `AmountFormatTests` :160
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_reports.py** (146 خط، 23 نماد)
    - `StatementTests` :12
    - `ExcelExportTests` :87
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_scoping.py** (167 خط، 18 نماد)
    - `ScopingTests` :18
    - `AuthenticationRequiredTests` :140
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_seed_demo.py** (86 خط، 11 نماد)
    - `SeedDemoTests` :18
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_services.py** (96 خط، 17 نماد)
    - `AccountCodeTests` :19
    - `RemainderTests` :26
    - `DateSearchQueryTests` :60
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_stats_api.py** (193 خط، 25 نماد)
    - `DashboardTests` :14
    - `CustomerStatsTests` :125
    - `TransactionStatsTests` :151
- **./.claude/worktrees/laughing-davinci-da5628/home/tests/test_transactions_api.py** (180 خط، 32 نماد)
    - `LedgerTests` :11
    - `DateSearchTests` :82
    - `AllTransactionsTests` :132
- **./.claude/worktrees/laughing-davinci-da5628/home/views.py** (406 خط، 43 نماد)
    - `CustomerPagination` :33
    - `OwnerScopedMixin` :42
    - `CustomerListCreateView` :59
    - `CustomerStatsView` :96
    - `CustomerDetailView` :107
    - `StatementView` :126
    - `ExcelExportView` :137
    - `DebtorReminderListView` :155
    - `DebtorReminderSendView` :163
    - `DashboardView` :195
    - `AllTransactionsPagination` :209
    - `AllTransactionsView` :220
    - `AllTransactionsStatsView` :249
    - `AllTransactionsSearchView` :256
- **./.claude/worktrees/laughing-davinci-da5628/manage.py** (22 خط، 1 نماد)
    - `main` :7
- **./account/admin.py** (22 خط، 3 نماد)
    - `MyUserAdmin` :6
    - `SMSLogAdmin` :14
- **./account/apps.py** (5 خط، 1 نماد)
    - `AccountConfig` :4
- **./account/models.py** (134 خط، 15 نماد)
    - `MyUserManager` :10
    - `upload_file` :29
    - `Roles` :40
    - `MyUser` :45
    - `SMSLog` :103
- **./account/serializers.py** (39 خط، 4 نماد)
    - `UserSerializer` :8
    - `ProfileUpdateSerializer` :18
- **./account/services.py** (128 خط، 9 نماد)
    - `OtpSendError` :19
    - `_dev_mode` :28
    - `_api_key` :32
    - `_run_with_timeout` :36
    - `_delivery_target` :45
    - `send_sms` :56
    - `send_token_sms` :76
- **./account/tests.py** (398 خط، 52 نماد)
    - `RegisterLoginTests` :23
    - `OtpTests` :95
    - `PasswordTests` :171
    - `ProfileTests` :231
    - `BusinessNameTests` :297
    - `SmsDeliveryTargetTests` :336
    - `DevTrustedOriginsTests` :381
- **./account/views.py** (371 خط، 26 نماد)
    - `normalize_digits` :37
    - `to_persian_digits` :44
    - `generate_otp_code` :49
    - `get_otp_remaining_seconds` :55
    - `normalize_phone_number` :63
    - `is_valid_iranian_mobile` :71
    - `CSRFView` :81
    - `MeView` :89
    - `RegisterView` :101
    - `LoginView` :141
    - `OtpPhoneView` :179
    - `OtpConfirmView` :227
    - `ForgetPasswordView` :288
    - `ProfileView` :325
- **./api/apps.py** (5 خط، 1 نماد)
    - `ApiConfig` :4
- **./api/views.py** (15 خط، 2 نماد)
    - `HealthView` :7
- **./chat/admin.py** (26 خط، 3 نماد)
    - `MessageInline` :6
    - `ConversationAdmin` :14
    - `MessageAdmin` :22
- **./chat/apps.py** (5 خط، 1 نماد)
    - `ChatConfig` :4
- **./chat/catalog.py** (82 خط، 4 نماد)
    - `default_model` :39
    - `resolve` :48
    - `supports_ui` :61
    - `choices` :71
- **./chat/engine.py** (814 خط، 18 نماد)
    - `is_fallback` :91
    - `_has_numbers` :104
    - `split_ui` :114
    - `_ui_prose_has_numbers` :216
    - `EngineNotConfigured` :220
    - `EngineError` :224
    - `is_configured` :228
    - `_proxies` :236
    - `_call_model` :259
    - `_merge_tool_deltas` :291
    - `_stream_model` :316
    - `_rescue_tool_calls` :396
    - `_looks_machine` :452
    - `_rescue_bare_call` :470
- **./chat/models.py** (88 خط، 8 نماد)
    - `Conversation` :6
    - `Message` :46
- **./chat/serializers.py** (42 خط، 7 نماد)
    - `MessageSerializer` :7
    - `ConversationSerializer` :14
    - `ConversationDetailSerializer` :38
- **./chat/suggestions.py** (129 خط، 2 نماد)
    - `build_suggestions` :86
- **./chat/test_engine.py** (426 خط، 51 نماد)
    - `say` :26
    - `call` :31
    - `ToolScopingTests` :38
    - `EngineLoopTests` :132
    - `RescueTests` :283
    - `MachineOutputTests` :345
    - `ProxyTests` :386
    - `NotConfiguredTests` :420
- **./chat/test_stream.py** (243 خط، 27 نماد)
    - `stream_of` :31
    - `tool_call` :43
    - `StreamLoopTests` :49
    - `StreamEncodingTests` :117
    - `ToolDeltaMergeTests` :150
    - `SuggestionTests` :182
- **./chat/test_ui.py** (275 خط، 44 نماد)
    - `LedgerMixin` :33
    - `UiToolTests` :48
    - `UiQueryViewTests` :107
    - `EngineUiModeTests` :151
    - `SplitUiTests` :240
    - `UiPromptTests` :255
- **./chat/test_widgets.py** (205 خط، 26 نماد)
    - `widget_for` :24
    - `WidgetBuilderTests` :30
    - `WidgetStreamTests` :117
    - `WidgetPersistenceTests` :161
- **./chat/tests.py** (368 خط، 49 نماد)
    - `ConversationCrudTests` :19
    - `MessageTests` :89
    - `ScopingTests` :179
    - `ModelPickerTests` :215
    - `RewindAndForkTests` :287
- **./chat/tools.py** (397 خط، 17 نماد)
    - `_customers_of` :35
    - `_clamp` :39
    - `_jalali` :43
    - `_transaction_row` :62
    - `has_data` :80
    - `tool_overview` :95
    - `tool_customer_summary` :115
    - `tool_transaction_summary` :120
    - `tool_debtors` :125
    - `tool_find_customer` :140
    - `tool_customer_ledger` :161
    - `tool_recent_transactions` :177
    - `tool_customer_transactions` :190
    - `tool_best_payers` :209
- **./chat/ui_tools.py** (466 خط، 28 نماد)
    - `_clamp` :47
    - `_status` :54
    - `_date` :59
    - `_customer` :66
    - `overview` :75
    - `monthly_trend` :92
    - `customer_mix` :105
    - `debt_aging` :111
    - `debtors` :115
    - `find_customer` :126
    - `customer_ledger` :140
    - `_transaction` :166
    - `customer_transactions` :172
    - `recent_transactions` :182
- **./chat/views.py** (379 خط، 26 نماد)
    - `OwnerScopedMixin` :27
    - `ConversationListCreateView` :40
    - `ConversationDetailView` :52
    - `ModelListView` :64
    - `UiQueryView` :78
    - `_apply_model` :101
    - `MessageCreateView` :115
    - `MessageActionMixin` :173
    - `MessageRewindView` :191
    - `MessageForkView` :216
    - `_sse` :261
    - `MessageStreamView` :271
- **./chat/widgets.py** (308 خط، 15 نماد)
    - `_status` :36
    - `_book_balance` :48
    - `_customer_id` :64
    - `_overview` :79
    - `_customer_summary` :95
    - `_transaction_summary` :112
    - `_debtors` :128
    - `_find_customer` :151
    - `_customer_ledger` :178
    - `_transaction_rows` :205
    - `_recent_transactions` :213
    - `_customer_transactions` :225
    - `_best_payers` :240
    - `_dormant_customers` :258
- **./core/permissions.py** (22 خط، 3 نماد)
    - `role_permission` :5
- **./core/settings.py** (322 خط، 1 نماد)
    - `_local_ipv` :195
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
- **./home/reminders.py** (125 خط، 3 نماد)
    - `format_amount` :25
    - `build_debtor_list` :34
    - `send_reminders` :87
- **./home/reports.py** (188 خط، 4 نماد)
    - `_today` :30
    - `build_statement` :36
    - `_write_sheet` :101
    - `build_workbook` :144
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
- **./home/tests/test_reminders.py** (164 خط، 23 نماد)
    - `DebtorListTests` :20
    - `ReminderSendTests` :82
    - `AmountFormatTests` :160
- **./home/tests/test_reports.py** (146 خط، 23 نماد)
    - `StatementTests` :12
    - `ExcelExportTests` :87
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
- **./home/views.py** (406 خط، 43 نماد)
    - `CustomerPagination` :33
    - `OwnerScopedMixin` :42
    - `CustomerListCreateView` :59
    - `CustomerStatsView` :96
    - `CustomerDetailView` :107
    - `StatementView` :126
    - `ExcelExportView` :137
    - `DebtorReminderListView` :155
    - `DebtorReminderSendView` :163
    - `DashboardView` :195
    - `AllTransactionsPagination` :209
    - `AllTransactionsView` :220
    - `AllTransactionsStatsView` :249
    - `AllTransactionsSearchView` :256
- **./manage.py** (22 خط، 1 نماد)
    - `main` :7

## فرانت‌اند

### صفحه‌ها
- **frontend/src/pages/Chat/Chat.jsx** (344 خط)
    - AgentIcon
    - Breadcrumb
    - ChatPane
    - ChatSidebar
    - Sidebar
    - notify
- **frontend/src/pages/Customers/CustomerLedger.jsx** (54 خط)
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
- **frontend/src/pages/Profile/Profile.jsx** (358 خط)
    - Breadcrumb
    - ChangePasswordModal
    - ScrollContainer
    - notify
- **frontend/src/pages/Statement/Statement.jsx** (208 خط)
    - LogoIcon
    - notify
- **frontend/src/pages/Transactions/Transactions.jsx** (491 خط)
    - Breadcrumb
    - CustomTooltip
    - CustomerPickerModal
    - Footer
    - MenuItem
    - RowSelectMark
    - ScrollContainer
    - TransactionKpis
    - notify

### کامپوننت‌های مشترک
- `AccentPicker` — 137 خط
- `AgentIcon` — 32 خط
- `Breadcrumb` — 72 خط
- `BusinessNameModal` — 166 خط
- `ChangePasswordModal` — 178 خط
- `CustomTooltip` — 54 خط
- `CustomerPickerModal` — 258 خط
- `DebtReminderModal` — 262 خط
- `Footer` — 476 خط
- `GuideModal` — 238 خط
- `Header` — 42 خط
- `KpiCard` — 134 خط
- `LogoIcon` — 36 خط
- `MenuItem` — 44 خط
- `ModalActions` — 53 خط
- `ModalCloseButton` — 30 خط
- `Pagination` — 77 خط
- `ProgressToast` — 119 خط
- `RowSelectMark` — 33 خط
- `ScrollContainer` — 115 خط
- `Sidebar` — 76 خط
- `ThemeMenuItem` — 33 خط
- `ThemeSwitcher` — 33 خط
- `WindowsIcon` — 40 خط

### لایهٔ API
- **auth.js**: me login register otpPhone otpConfirm forgetPassword updateProfile changePassword logout

- **chat.js**: list create detail remove rename rewind fork send models query

- **chatStream.js**: 

- **client.js**: get post put patch delete

- **customers.js**: list stats create update remove

- **dashboard.js**: get

- **reminders.js**: debtors send

- **reports.js**: statement

- **transactions.js**: list stats search create update remove list stats search

