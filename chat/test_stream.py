"""استریمِ پاسخ و پیشنهادِ عمل.

⚠️ مثل بقیهٔ تست‌های موتور، هیچ‌کدام به مدلِ واقعی وصل نمی‌شوند — `_stream_model`
جایگزین می‌شود. تستی که مدلِ محلی را صدا بزند چند دقیقه طول می‌کشد و روی ماشینی
که اولاما بالا نباشد بی‌دلیل قرمز می‌شود.
"""
import io
import json
import time
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.engine import MAX_STEPS, _merge_tool_deltas, _stream_model, answer_stream
from chat.models import Conversation
from chat.suggestions import FOLLOW_UPS, MAX_SUGGESTIONS, build_suggestions
from home.tests.factories import make_customer, make_owner, make_transaction

# ⚠️ آدرسِ بی‌اسکیما عمدی است: `requests` **بی‌درنگ** ردش می‌کند، پس هر
# فراخوانیِ ماک‌نشده فوراً لو می‌رود. با آدرسِ واقعی، یک تستِ جاافتاده به مدلِ
# زنده وصل می‌شد و ۱۷۰ ثانیه طول می‌کشید بی‌آنکه کسی بفهمد چرا؛ حتی پورتِ بسته
# هم جواب نداد، چون در WSL اتصال به پورتِ خالی رد نمی‌شود بلکه معلق می‌ماند.
LLM = {"LLM_BASE_URL": "بدون-اسکیما", "LLM_API_KEY": "x", "LLM_MODEL": "test"}
# برای تستی که خودِ `requests.post` را ماک می‌کند و به آدرسِ معتبر نیاز دارد
LLM_REAL = {**LLM, "LLM_BASE_URL": "http://x/v1"}


def stream_of(*pieces, tool_calls=None):
    """`_stream_model`ِ ساختگی: تکه‌ها را بیرون می‌دهد و پیامِ کامل را برمی‌گرداند."""
    def fake(_messages):
        for piece in pieces:
            yield piece
        message = {"role": "assistant", "content": "".join(pieces)}
        if tool_calls:
            message["tool_calls"] = tool_calls
        return message
    return fake


def tool_call(name, arguments="{}"):
    return [{"id": "c1", "type": "function",
             "function": {"name": name, "arguments": arguments}}]


@override_settings(**LLM)
class StreamLoopTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.customer = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        make_transaction(self.owner, self.customer, debt=500_000)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.conversation.messages.create(role="user", body="بدهکارانم؟")

    def collect(self, fake):
        with patch("chat.engine._stream_model", side_effect=fake):
            return list(answer_stream(self.owner, self.conversation))

    def test_text_arrives_in_pieces(self):
        events = self.collect(stream_of("سلام", " دنیا"))
        deltas = [payload for kind, payload in events if kind == "delta"]
        self.assertEqual(deltas, ["سلام", " دنیا"])

        kind, payload = events[-1]
        self.assertEqual(kind, "done")
        self.assertEqual(payload[0], "سلام دنیا")

    def test_tool_runs_before_the_answer_streams(self):
        """قرارداد: ابزار اول اجرا می‌شود، بعد جواب تکه‌تکه می‌آید."""
        streams = [stream_of(tool_calls=tool_call("debtors")),
                   stream_of("یک", " نفر")]
        calls = iter(streams)
        events = self.collect(lambda messages: next(calls)(messages))

        kinds = [kind for kind, _ in events]
        self.assertEqual(kinds.index("tool"), 0)          # ابزار پیش از هر متنی
        self.assertLess(kinds.index("tool"), kinds.index("delta"))

        text, used, _context = events[-1][1]
        self.assertEqual(text, "یک نفر")
        self.assertEqual(used, ["debtors"])

    def test_no_text_leaks_while_a_tool_is_being_requested(self):
        """قدمی که به ابزار ختم می‌شود نباید چیزی روی صفحه بنویسد."""
        streams = [stream_of(tool_calls=tool_call("debtors")), stream_of("تمام")]
        calls = iter(streams)
        events = self.collect(lambda messages: next(calls)(messages))

        deltas = [p for k, p in events if k == "delta"]
        self.assertEqual(deltas, ["تمام"])

    def test_raw_tool_call_in_text_triggers_a_reset(self):
        """اگر متنِ خامِ فراخوانی روی صفحه رفت، فرانت باید پاکش کند.

        وگرنه کاربر JSONِ داخلیِ مدل را به‌عنوان جواب می‌بیند — همان چیزی که با
        `qwen2.5` واقعاً رخ داد.
        """
        streams = [stream_of('{"name": "debtors", "arguments": {"limit": 3}}'),
                   stream_of("سه نفر.")]
        calls = iter(streams)
        events = self.collect(lambda messages: next(calls)(messages))

        kinds = [kind for kind, _ in events]
        self.assertIn("reset", kinds)
        self.assertLess(kinds.index("reset"), kinds.index("tool"))
        self.assertEqual(events[-1][1][0], "سه نفر.")

    def test_loop_stops_at_max_steps(self):
        events = self.collect(stream_of(tool_calls=tool_call("debtors")))
        tools = [p for k, p in events if k == "tool"]
        self.assertEqual(len(tools), MAX_STEPS)
        self.assertEqual(events[-1][0], "done")


class StreamEncodingTests(APITestCase):
    """قرارداد: جریان همیشه UTF-8 خوانده می‌شود.

    ⚠️ اولاما `text/event-stream` را بدونِ charset می‌فرستد و `requests` برای
    `text/*`ِ بی‌charset به ISO-8859-1 برمی‌گردد. بدونِ تعیینِ صریحِ encoding،
    کلِ پاسخِ فارسی به‌هم‌ریخته می‌رسد — و چون خطایی پرتاب نمی‌شود، تنها راهِ
    فهمیدنش نگاه کردن به صفحه است.
    """

    @override_settings(**LLM_REAL)
    def test_utf8_is_forced_on_the_response(self):
        import requests

        # مرزِ رویدادهای SSE دو خطِ خالی است؛ با chr(10) نوشته می‌شود تا
        # اسکیپ‌های تودرتو خواناییِ تست را از بین نبرند
        sep = chr(10) * 2
        body = (
            'data: {"choices":[{"delta":{"content":"بدهکار"}}]}' + sep
            + 'data: [DONE]' + sep
        ).encode("utf-8")

        fake = requests.Response()
        fake.status_code = 200
        fake.raw = io.BytesIO(body)
        # همان چیزی که اولاما می‌دهد: بدونِ charset
        fake.headers["Content-Type"] = "text/event-stream"

        with patch("chat.engine.requests.post", return_value=fake):
            pieces = list(_stream_model([{"role": "user", "content": "x"}]))

        self.assertEqual(pieces, ["بدهکار"])


class ToolDeltaMergeTests(APITestCase):
    """تکه‌های `tool_calls` در استریم باید بر اساسِ `index` جمع شوند نه ترتیبِ ورود."""

    def test_arguments_are_concatenated_not_replaced(self):
        buffer = {}
        _merge_tool_deltas(buffer, [{"index": 0, "id": "a",
                                     "function": {"name": "debtors", "arguments": '{"li'}}])
        _merge_tool_deltas(buffer, [{"index": 0, "function": {"arguments": 'mit": 5}'}}])

        self.assertEqual(buffer[0]["function"]["name"], "debtors")
        self.assertEqual(json.loads(buffer[0]["function"]["arguments"]), {"limit": 5})

    def test_missing_id_gets_one(self):
        """قرارداد: `id` هیچ‌وقت خالی نمی‌ماند.

        اولاما در استریم شناسه نمی‌فرستد، و پیامی که با `"id": ""` به سرور
        برگردد با ۴۰۰ رد می‌شود — پیش از اینکه مدل اصلاً ببیندش.
        """
        buffer = {}
        _merge_tool_deltas(buffer, [{"index": 0, "function": {"name": "debtors", "arguments": "{}"}}])
        self.assertTrue(buffer[0]["id"])

    def test_two_tools_stay_separate(self):
        buffer = {}
        _merge_tool_deltas(buffer, [
            {"index": 0, "function": {"name": "debtors", "arguments": "{}"}},
            {"index": 1, "function": {"name": "overview", "arguments": "{}"}},
        ])
        self.assertEqual(buffer[0]["function"]["name"], "debtors")
        self.assertEqual(buffer[1]["function"]["name"], "overview")


class SuggestionTests(APITestCase):
    """پیشنهادها سوالِ بعدی‌اند، نه لینک."""

    def test_every_tool_has_follow_up_questions(self):
        """⚠️ ابزارِ تازه بدونِ پیشنهاد یعنی ردیفِ پیشنهادها بی‌صدا خالی می‌ماند.

        `build_suggestions` برای ابزارِ ناشناخته عمداً چیزی برنمی‌گرداند، پس
        این نقص خطا نمی‌دهد و فقط یک قابلیت خاموش می‌شود. تست جلویش را می‌گیرد.
        """
        from chat.tools import TOOLS
        missing = [tool["name"] for tool in TOOLS if tool["name"] not in FOLLOW_UPS]
        self.assertEqual(missing, [])

    def test_no_tools_means_no_suggestion(self):
        """دستیاری که فقط سلام کرده، ردیفِ سوال‌های چسبانده مزاحمت است نه کمک."""
        self.assertEqual(build_suggestions([]), [])

    def test_suggestions_are_questions_not_destinations(self):
        """قرارداد: خروجی متنِ سوال است — همان چیزی که با کلیک فرستاده می‌شود.

        نسخهٔ اول `{label, action}` می‌داد و دکمه‌ها کاربر را از گفتگو بیرون
        می‌بردند؛ حالا گفتگو ادامه پیدا می‌کند.
        """
        out = build_suggestions(["debtors"])
        self.assertTrue(all(isinstance(item, str) and item for item in out))
        self.assertTrue(any("؟" in item for item in out))

    def test_specific_tool_comes_first(self):
        """مسیرِ گفتگو از کلی به جزئی می‌رود؛ آخرین قدم همان چیزی است که دنبالش بود."""
        out = build_suggestions(["overview", "debtors"])
        self.assertIn(out[0], FOLLOW_UPS["debtors"])

    def test_never_more_than_the_cap(self):
        """با بیشتر از سه‌تا، ردیفِ پیشنهادها می‌شکند و شلوغی می‌شود."""
        out = build_suggestions(["overview", "customer_summary", "transaction_summary", "debtors"])
        self.assertLessEqual(len(out), MAX_SUGGESTIONS)

    def test_row_is_topped_up_to_the_floor(self):
        out = build_suggestions(["debtors"])
        self.assertGreaterEqual(len(out), 2)

    def test_no_duplicate_questions(self):
        out = build_suggestions(["find_customer", "overview"])
        self.assertEqual(len(out), len(set(out)))

    def test_unknown_tool_is_skipped(self):
        self.assertEqual(build_suggestions(["something_new"]), [])
