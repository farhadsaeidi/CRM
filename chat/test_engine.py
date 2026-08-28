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
from chat.tools import run_tool, tool_schemas
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


class NotConfiguredTests(APITestCase):
    @override_settings(LLM_BASE_URL="", LLM_MODEL="")
    def test_missing_settings_raise_a_clear_error(self):
        owner = make_owner()
        conversation = Conversation.objects.create(owner=owner)
        with self.assertRaises(EngineNotConfigured):
            answer(owner, conversation)
