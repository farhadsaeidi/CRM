"""موتورِ دستیار — ابزارها و حلقهٔ tool calling.

⚠️ هیچ‌کدام از این تست‌ها به مدلِ واقعی وصل نمی‌شوند: `_call_model` جایگزین
می‌شود. تستی که به یک سرویسِ بیرونی وابسته باشد، هم کند است هم وقتی آن سرویس
بالا نباشد بی‌دلیل قرمز می‌شود — و اینجا سرویس یک مدلِ محلی است که ممکن است
اصلاً اجرا نشده باشد.
"""
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from chat.engine import MAX_STEPS, EngineNotConfigured, answer
from chat.models import Conversation
from chat.tools import has_data, run_tool, tool_schemas
from home.dashboard import JALALI_MONTHS
from home.tests.factories import make_customer, make_owner, make_transaction

# ⚠️ آدرسِ بی‌اسکیما عمدی است: `requests` **بی‌درنگ** ردش می‌کند، پس هر
# فراخوانیِ ماک‌نشده فوراً لو می‌رود. با آدرسِ واقعی، یک تستِ جاافتاده به مدلِ
# زنده وصل می‌شد و ۱۷۰ ثانیه طول می‌کشید بی‌آنکه کسی بفهمد چرا؛ حتی پورتِ بسته
# هم جواب نداد، چون در WSL اتصال به پورتِ خالی رد نمی‌شود بلکه معلق می‌ماند.
LLM = {"LLM_BASE_URL": "بدون-اسکیما", "LLM_API_KEY": "x", "LLM_MODEL": "test"}


def say(text):
    """پاسخِ متنیِ مدل."""
    return {"role": "assistant", "content": text}


def call(name, arguments="{}", call_id="c1"):
    """درخواستِ مدل برای صدا زدنِ یک ابزار."""
    return {"role": "assistant", "content": "",
            "tool_calls": [{"id": call_id, "type": "function",
                            "function": {"name": name, "arguments": arguments}}]}


class ToolScopingTests(APITestCase):
    """قرارداد: ابزارها فقط دفترِ مالکِ سشن را می‌بینند."""

    def setUp(self):
        self.owner = make_owner()
        self.mine = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        make_transaction(self.owner, self.mine, debt=500_000)

        self.stranger = make_owner()
        self.theirs = make_customer(self.stranger, "غریبه", phone="09121110009")
        make_transaction(self.stranger, self.theirs, debt=9_000_000)

    def test_no_tool_accepts_an_owner_argument(self):
        """مهم‌ترین قاعده: مالک پارامترِ هیچ ابزاری نیست.

        اگر روزی کسی `owner` یا `user_id` به یک ابزار اضافه کند، مدل می‌تواند
        مقدارش را عوض کند و دفترِ دیگری را بخواند. این تست جلویش را می‌گیرد.
        """
        for schema in tool_schemas():
            params = schema["function"]["parameters"].get("properties", {})
            for forbidden in ("user", "user_id", "owner", "owner_id"):
                self.assertNotIn(forbidden, params, schema["function"]["name"])

    def test_find_customer_sees_only_my_customers(self):
        result = run_tool(self.owner, "find_customer", {"query": "غریبه"})
        self.assertIn("نتیجه", result)   # پیدا نشد

        result = run_tool(self.owner, "find_customer", {"query": "رضا"})
        self.assertEqual(len(result["یافته‌ها"]), 1)

    def test_ledger_of_another_owner_is_refused(self):
        result = run_tool(self.owner, "customer_ledger", {"customer_id": self.theirs.id})
        self.assertIn("خطا", result)
        self.assertNotIn("9000000", str(result))

    def test_debtors_excludes_other_owners(self):
        result = run_tool(self.owner, "debtors", {})
        names = [row["نام"] for row in result["فهرست"]]
        self.assertEqual(names, ["رضا احمدی"])

    def test_unknown_tool_returns_an_error_not_a_crash(self):
        self.assertIn("خطا", run_tool(self.owner, "drop_database", {}))

    def test_recent_transactions_sees_only_my_ledger(self):
        """⚠️ سوالی که هیچ ابزاری نداشت و مدل جوابش را از خودش ساخت.

        تا امروز «آخرین تراکنش کدام است؟» با هیچ ابزاری قابلِ جواب نبود، پس
        مدل `find_customer` را با عبارتِ «آخرین تراکنش» صدا می‌زد و بعد نام و
        تاریخ می‌ساخت. حالا ابزارش هست.
        """
        result = run_tool(self.owner, "recent_transactions", {})
        names = [row["مشتری"] for row in result["تراکنش‌ها"]]
        self.assertEqual(names, ["رضا احمدی"])
        self.assertNotIn("غریبه", str(result))

    def test_recent_transactions_carry_the_date_in_both_ready_made_shapes(self):
        """⚠️ هر تبدیلی که به مدل سپرده شود، جایی اشتباه می‌شود.

        مسیرِ این باگ سه پله بود:
        ۱. سه ستونِ `year/month/day` جدا می‌رفت و مدل سرِ هم می‌کرد.
        ۲. رشتهٔ آمادهٔ `1405/02/20` ساخته شد — ولی مدل **باز هم** تبدیل کرد و
           روی صفحهٔ کاربر نوشت «۲۰ فروردین ۱۴۰۵»، در حالی که ماهِ ۰۲
           اردیبهشت است.
        ۳. حالا نامِ ماه هم در خروجی هست و کارِ مدل فقط کپی کردن است.
        """
        row = run_tool(self.owner, "recent_transactions", {})["تراکنش‌ها"][0]
        self.assertRegex(row["تاریخ_شمسی"], r"^\d{4}/\d{2}/\d{2}$")

        year, month, day = row["تاریخ_شمسی"].split("/")
        spelled = row["تاریخ_به_حروف"]
        self.assertIn(JALALI_MONTHS[int(month) - 1], spelled)
        self.assertIn(year, spelled)
        self.assertIn(str(int(day)), spelled)

    def test_customer_transactions_of_another_owner_are_refused(self):
        result = run_tool(self.owner, "customer_transactions",
                          {"customer_id": self.theirs.id})
        self.assertIn("خطا", result)
        self.assertNotIn("9000000", str(result))

    def test_has_data_separates_a_result_from_an_excuse(self):
        """پایهٔ گاردِ موتور: «پیدا نشد» پشتوانه نیست، «صفر نفر» هست."""
        self.assertFalse(has_data(run_tool(self.owner, "find_customer", {"query": "غریبه"})))
        self.assertFalse(has_data(run_tool(self.owner, "customer_ledger", {"customer_id": 0})))
        self.assertTrue(has_data(run_tool(self.owner, "debtors", {})))
        self.assertTrue(has_data(run_tool(self.owner, "customer_summary", {})))

    def test_unexpected_arguments_are_dropped(self):
        """مدل گاهی کلیدِ اضافه می‌فرستد؛ نباید TypeError بدهد."""
        result = run_tool(self.owner, "debtors", {"limit": 3, "owner_id": self.stranger.id})
        self.assertIn("فهرست", result)


@override_settings(**LLM)
class EngineLoopTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        customer = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        make_transaction(self.owner, customer, debt=500_000)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.conversation.messages.create(role="user", body="بدهکارانم چند نفرند؟")

    def test_direct_answer_without_tools(self):
        with patch("chat.engine._call_model", return_value=say("سلام!")) as mock:
            text, used = answer(self.owner, self.conversation)
        self.assertEqual(text, "سلام!")
        self.assertEqual(used, [])
        self.assertEqual(mock.call_count, 1)

    def test_tool_result_is_fed_back_and_summarised(self):
        replies = [call("debtors"), say("یک نفر بدهکار است.")]
        with patch("chat.engine._call_model", side_effect=replies) as mock:
            text, used = answer(self.owner, self.conversation)

        self.assertEqual(text, "یک نفر بدهکار است.")
        self.assertEqual(used, ["debtors"])

        # دورِ دوم باید نتیجهٔ ابزار را دیده باشد
        second = mock.call_args_list[1][0][0]
        roles = [m["role"] for m in second]
        self.assertIn("tool", roles)
        tool_message = next(m for m in second if m["role"] == "tool")
        self.assertIn("رضا احمدی", tool_message["content"])

    def test_persian_survives_the_round_trip(self):
        """قرارداد: نتیجهٔ ابزار با `ensure_ascii=False` می‌رود.

        وگرنه فارسی به \\uXXXX تبدیل می‌شود؛ هم توکن هدر می‌رود هم مدل باید
        رمزگشایی‌اش کند.
        """
        replies = [call("find_customer", '{"query": "رضا"}'), say("پیدا شد.")]
        with patch("chat.engine._call_model", side_effect=replies) as mock:
            answer(self.owner, self.conversation)

        tool_message = next(m for m in mock.call_args_list[1][0][0] if m["role"] == "tool")
        self.assertIn("رضا احمدی", tool_message["content"])
        self.assertNotIn("\\u", tool_message["content"])

    def test_loop_stops_at_max_steps(self):
        """مدلی که بی‌پایان ابزار صدا می‌زند نباید سرور را گروگان بگیرد."""
        with patch("chat.engine._call_model", return_value=call("debtors")) as mock:
            text, _ = answer(self.owner, self.conversation)
        self.assertEqual(mock.call_count, MAX_STEPS)
        self.assertIn("جمع‌بندی", text)

    def test_broken_arguments_do_not_crash(self):
        replies = [call("debtors", "{این JSON نیست}"), say("انجام شد.")]
        with patch("chat.engine._call_model", side_effect=replies):
            text, used = answer(self.owner, self.conversation)
        self.assertEqual(text, "انجام شد.")
        self.assertEqual(used, ["debtors"])

    def test_numbers_without_a_tool_get_a_second_chance(self):
        """قرارداد: عددِ بی‌پشتوانه پذیرفته نمی‌شود.

        ⚠️ مدل گاهی بدونِ صدا زدنِ ابزار جواب می‌دهد و رقم‌ها را از خودش می‌سازد —
        در دفترِ حساب بدترین خروجیِ ممکن. `tool_choice: "required"` راهِ
        استانداردش است ولی **اولاما نادیده‌اش می‌گیرد** (آزموده شد)، پس اجبار در
        حلقهٔ خودمان انجام می‌شود: یک تذکر، و یک تلاشِ دوباره.
        """
        replies = [say("شما ۱۲ مشتری دارید."), call("customer_summary"), say("۳۳ مشتری دارید.")]
        with patch("chat.engine._call_model", side_effect=replies) as mock:
            text, used = answer(self.owner, self.conversation)

        self.assertEqual(used, ["customer_summary"])
        self.assertEqual(text, "۳۳ مشتری دارید.")

        # دورِ دوم باید تذکر را دیده باشد
        second = mock.call_args_list[1][0][0]
        self.assertTrue(any("ساختگی" in (m.get("content") or "") for m in second))

    def test_an_answer_without_numbers_is_left_alone(self):
        """«سلام» ابزار لازم ندارد؛ تذکر روی آن فقط وقت تلف کردن است."""
        with patch("chat.engine._call_model", return_value=say("سلام! چطور کمکتان کنم؟")) as mock:
            text, used = answer(self.owner, self.conversation)
        self.assertEqual(mock.call_count, 1)
        self.assertEqual(used, [])
        self.assertIn("سلام", text)

    def test_the_nudge_happens_only_once(self):
        """هر تلاش روی CPU چند دقیقه است؛ حلقهٔ تذکر نباید باز شود."""
        with patch("chat.engine._call_model", return_value=say("۱۲ مشتری.")) as mock:
            _, used = answer(self.owner, self.conversation)
        self.assertEqual(mock.call_count, 2)
        self.assertEqual(used, [])

    def test_an_ungrounded_number_is_refused_not_displayed(self):
        """قرارداد: عددِ بی‌پشتوانه **نمایش داده نمی‌شود**.

        ⚠️ پیش‌تر بعد از تذکرِ ناموفق همان جمله روی صفحه می‌نشست و فقط یک خطِ
        هشدارِ ریز زیرش می‌آمد. کاربر عدد را می‌خواند و هشدار را نه. در دفترِ
        حساب «نمی‌دانم» بی‌ضرر است و عددِ ساختگی نیست.
        """
        with patch("chat.engine._call_model", return_value=say("۱۲ مشتری.")):
            text, _ = answer(self.owner, self.conversation)
        self.assertNotIn("۱۲", text)
        self.assertIn("نتوانستم", text)

    def test_a_tool_that_found_nothing_is_not_grounding(self):
        """⚠️ همان باگی که روی صفحهٔ کاربر دیده شد.

        مدل `find_customer` را با عبارتی بی‌ربط صدا زد، ابزار «پیدا نشد»
        برگرداند، و مدل نام و تاریخِ ساختگی نوشت — در حالی که گاردِ قدیمی
        راضی بود چون «ابزاری اجرا شده بود». اجرا شدن پشتوانه نیست.
        """
        replies = [call("find_customer", '{"query": "آخرین تراکنش"}'),
                   say('آخرین تراکنش مربوط به "محمدرضا نصیری" در ۱۳۹۹/۰۶/۰۵ است.'),
                   say("باز هم نمی‌دانم ۱۲۳.")]
        with patch("chat.engine._call_model", side_effect=replies):
            text, used = answer(self.owner, self.conversation)

        self.assertEqual(used, [])                 # هیچ ابزاری داده نداد
        self.assertNotIn("نصیری", text)            # نامِ ساختگی نشان داده نشد
        self.assertNotIn("۱۳۹۹", text)

    def test_a_tool_that_found_something_is_grounding(self):
        """روی دیگرِ سکه: پیدا شدن یعنی مدل حق دارد جواب بدهد."""
        replies = [call("find_customer", '{"query": "رضا"}'), say("رضا احمدی پیدا شد، ۱ نفر.")]
        with patch("chat.engine._call_model", side_effect=replies) as mock:
            text, used = answer(self.owner, self.conversation)
        self.assertEqual(used, ["find_customer"])
        self.assertEqual(mock.call_count, 2)
        self.assertIn("رضا احمدی", text)

    def test_empty_content_is_not_shown_as_a_blank_reply(self):
        with patch("chat.engine._call_model", return_value=say("")):
            text, _ = answer(self.owner, self.conversation)
        self.assertTrue(text.strip())

    def test_history_is_sent_but_not_duplicated(self):
        """قرارداد: سوال یک بار می‌رود، نه دو بار.

        ویو پیام را پیش از فراخوانی ذخیره می‌کند، پس اگر موتور هم جدا اضافه‌اش
        کند مدل سوال را دوتایی می‌بیند.
        """
        with patch("chat.engine._call_model", return_value=say("باشد")) as mock:
            answer(self.owner, self.conversation)

        sent = mock.call_args_list[0][0][0]
        questions = [m for m in sent if m.get("content") == "بدهکارانم چند نفرند؟"]
        self.assertEqual(len(questions), 1)
        self.assertEqual(sent[0]["role"], "system")


@override_settings(**LLM)
class RescueTests(APITestCase):
    """قرارداد: فراخوانیِ ابزاری که به‌صورت **متن** آمده، جواب نیست.

    ⚠️ `qwen2.5:7b` گاهی به‌جای فیلدِ `tool_calls`، خودِ فراخوانی را داخلِ متن
    می‌نویسد — و هر بار به شکلی دیگر. اگر نجاتش ندهیم، همان رشته به‌عنوان
    پاسخِ نهایی روی صفحهٔ کاربر می‌نشیند. هر شکلی که در عمل دیده شده اینجا یک
    تست دارد؛ اگر روزی شکلِ تازه‌ای دیدید، یک تستِ تازه هم اضافه کنید.
    """

    def setUp(self):
        self.owner = make_owner()
        customer = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        make_transaction(self.owner, customer, debt=500_000)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.conversation.messages.create(role="user", body="بدهکارانم چند نفرند؟")

    def run_with(self, leaked):
        replies = [say(leaked), say("یک نفر بدهکار است.")]
        with patch("chat.engine._call_model", side_effect=replies):
            return answer(self.owner, self.conversation)

    def test_name_inside_the_json(self):
        text, used = self.run_with('{"name": "debtors", "arguments": {}}')
        self.assertEqual(used, ["debtors"])
        self.assertEqual(text, "یک نفر بدهکار است.")

    def test_name_before_a_bare_object(self):
        """شکلی که در عمل روی صفحهٔ کاربر دیده شد: `find_customer{...}`."""
        text, used = self.run_with('find_customer{"query": "رضا"}')
        self.assertEqual(used, ["find_customer"])
        self.assertEqual(text, "یک نفر بدهکار است.")

    def test_name_before_an_object_with_a_separator(self):
        text, used = self.run_with('debtors: {"limit": 5}')
        self.assertEqual(used, ["debtors"])

    def test_wrapped_in_a_tool_call_tag(self):
        leaked = '<tool_call>{"name": "customer_summary", "arguments": {}}</tool_call>'
        _, used = self.run_with(leaked)
        self.assertEqual(used, ["customer_summary"])

    def test_plain_prose_is_not_mistaken_for_a_call(self):
        """متنِ سالم نباید «نجات» شود.

        اسمِ ابزار ممکن است در جوابِ فارسی هم بیاید؛ فقط وقتی فراخوانی است که
        آکولاد بلافاصله بعدش باشد.
        """
        with patch("chat.engine._call_model", return_value=say(
                "برای دیدن بدهکاران debtors را می‌خوانم. {توضیح}")) as mock:
            text, used = answer(self.owner, self.conversation)
        self.assertEqual(used, [])
        self.assertEqual(mock.call_count, 1)
        self.assertIn("بدهکاران", text)

    def test_an_unknown_name_is_not_rescued(self):
        """`drop_database{...}` ابزار نیست و نباید ساخته شود."""
        with patch("chat.engine._call_model", return_value=say('drop_database{"x": 1}')):
            _, used = answer(self.owner, self.conversation)
        self.assertEqual(used, [])


@override_settings(**LLM)
class MachineOutputTests(APITestCase):
    """قرارداد: خروجیِ داخلیِ مدل هرگز به‌عنوان جواب نمایش داده نمی‌شود.

    ⚠️ این تست‌ها مهم‌تر از تست‌های نجات‌اند. نجات‌دهنده‌ها هر کدام یک **شکلِ
    شناخته‌شده** را می‌گیرند و فهرستشان هیچ‌وقت کامل نمی‌شود؛ این گارد بدونِ
    شناختنِ شکل جلوی نشستنِ متنِ خام روی صفحه را می‌گیرد.
    """

    def setUp(self):
        self.owner = make_owner()
        make_customer(self.owner, "رضا احمدی", phone="09121110001")
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.conversation.messages.create(role="user", body="سلام")

    def test_an_unknown_shape_gets_one_more_try(self):
        junk = '<|tool_call_begin|>whatever<|tool_call_end|>'
        with patch("chat.engine._call_model", side_effect=[say(junk), say("سلام!")]) as mock:
            text, _ = answer(self.owner, self.conversation)

        self.assertEqual(text, "سلام!")
        second = mock.call_args_list[1][0][0]
        self.assertTrue(any("قالبش" in (m.get("content") or "") for m in second))

    def test_raw_text_is_never_shown_after_the_retry(self):
        # بدونِ رقم، تا فقط گاردِ قالب سنجیده شود نه تذکرِ عددِ بی‌پشتوانه
        junk = '{"tool": "debtors", "parameters": {"order": "desc"}}'
        with patch("chat.engine._call_model", return_value=say(junk)) as mock:
            text, _ = answer(self.owner, self.conversation)

        self.assertEqual(mock.call_count, 2)
        self.assertNotIn("debtors", text)
        self.assertNotIn("{", text)

    def test_a_normal_persian_answer_is_left_alone(self):
        """جوابِ سالم نباید قربانیِ گارد شود."""
        with patch("chat.engine._call_model", return_value=say("سلام! چطور کمکتان کنم؟")) as mock:
            text, _ = answer(self.owner, self.conversation)
        self.assertEqual(mock.call_count, 1)
        self.assertIn("سلام", text)


class NotConfiguredTests(APITestCase):
    @override_settings(LLM_BASE_URL="", LLM_MODEL="")
    def test_missing_settings_raise_a_clear_error(self):
        owner = make_owner()
        conversation = Conversation.objects.create(owner=owner)
        with self.assertRaises(EngineNotConfigured):
            answer(owner, conversation)
