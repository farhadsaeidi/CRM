"""ویجت‌های پاسخِ دستیار — کارت و جدولی که عددهایش مستقیم از خروجیِ ابزار می‌آید.

⚠️ مثل بقیهٔ تست‌های موتور، هیچ‌کدام به مدلِ واقعی وصل نمی‌شوند. سازنده‌ها با
خروجیِ **واقعیِ** ابزارها روی دادهٔ ساخته‌شده سنجیده می‌شوند، نه با دیکشنریِ
دست‌نوشته — وگرنه روزی که شکلِ خروجیِ یک ابزار عوض شود، تست همچنان سبز می‌ماند
و فقط ویجت بی‌صدا ناپدید می‌شد.
"""
import json
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from chat.engine import _history, answer_stream
from chat.models import Conversation
from chat.tools import TOOLS, run_tool
from chat.widgets import _BUILDERS, build_widget
from home.tests.factories import make_customer, make_owner, make_transaction

from .test_stream import LLM, stream_of, tool_call


def widget_for(user, name, arguments=None):
    """ویجتِ یک ابزار روی خروجیِ واقعی‌اش — همان مسیری که موتور می‌رود."""
    arguments = arguments or {}
    return build_widget(name, arguments, run_tool(user, name, arguments))


class WidgetBuilderTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.reza = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        self.sara = make_customer(self.owner, "سارا رضایی", phone="09121110002")
        make_transaction(self.owner, self.reza, debt=500_000)
        make_transaction(self.owner, self.reza, paid=200_000)
        make_transaction(self.owner, self.sara, debt=100_000)

    def test_every_tool_has_a_widget_builder(self):
        """⚠️ ابزارِ تازه بدونِ سازنده یعنی جوابش بی‌صدا فقط متن می‌ماند.

        `build_widget` برای ابزارِ ناشناخته عمداً `None` می‌دهد، پس این نقص
        هیچ خطایی نمی‌سازد و فقط یک قابلیت خاموش می‌شود. تست جلویش را می‌گیرد.
        """
        missing = [tool["name"] for tool in TOOLS if tool["name"] not in _BUILDERS]
        self.assertEqual(missing, [])

    def test_debtors_table_shows_the_tools_own_numbers(self):
        """قرارداد: عددِ ویجت همان عددی است که ابزار به مدل داد، نه محاسبهٔ دوم."""
        result = run_tool(self.owner, "debtors", {})
        widget = build_widget("debtors", {}, result)

        self.assertEqual(widget["type"], "table")
        self.assertEqual([row["amount"] for row in widget["rows"]],
                         [row["بدهی"] for row in result["فهرست"]])
        self.assertEqual(widget["total"]["value"], result["مجموع_طلب"])
        self.assertEqual(widget["rows"][0]["customer_id"], self.reza.id)

    def test_customer_ledger_uses_the_customers_side(self):
        """مانده بدونِ علامت نشان داده می‌شود و وضعیت را برچسب می‌گوید — همان جدول‌ها."""
        widget = widget_for(self.owner, "customer_ledger", {"customer_id": self.reza.id})
        balance = widget["items"][0]
        self.assertEqual(balance["value"], 300_000)
        self.assertEqual(balance["badge"]["text"], "بدهکار")
        self.assertEqual(widget["link"], {"label": "دفتر حساب", "target": "ledger",
                                          "customer_id": self.reza.id})

    def test_book_balance_uses_the_owners_side(self):
        """⚠️ ماندهٔ کلِ دفتر برعکسِ حسابِ یک مشتری است — همان کاشیِ داشبورد.

        مشتری‌ها روی هم بدهکارند، پس صاحبِ دفتر «طلبکار» است.
        """
        widget = widget_for(self.owner, "overview", {"period": "all"})
        balance = widget["items"][0]
        self.assertEqual(balance["value"], 400_000)
        self.assertEqual(balance["badge"]["text"], "طلبکار")

    def test_single_customer_lookup_has_no_table(self):
        """با یک نتیجه، مدل مستقیم سراغِ حسابِ همان شخص می‌رود؛ جدولِ یک‌ردیفه تکرار است."""
        self.assertIsNone(widget_for(self.owner, "find_customer", {"query": "احمدی"}))

    def test_ambiguous_lookup_gets_a_table(self):
        widget = widget_for(self.owner, "find_customer", {"query": "رضا"})
        self.assertEqual(widget["type"], "table")
        self.assertEqual(len(widget["rows"]), 2)

    def test_never_active_customer_has_no_day_count(self):
        """«هرگز» با `None` گفته می‌شود نه با یک رشته در جای عدد."""
        make_customer(self.owner, "مشتری بی‌تراکنش", phone="09121110003")
        widget = widget_for(self.owner, "dormant_customers")
        never = [row for row in widget["rows"] if row["name"] == "مشتری بی‌تراکنش"]
        self.assertEqual(never[0]["days"], None)
        self.assertEqual(widget["columns"][1]["empty"], "بدون تراکنش")

    def test_no_data_means_no_widget(self):
        self.assertIsNone(build_widget("recent_transactions", {}, {"نتیجه": "هیچ تراکنشی نیست."}))
        self.assertIsNone(build_widget("customer_ledger", {"customer_id": 999}, {"خطا": "نیست."}))

    def test_unknown_tool_means_no_widget(self):
        self.assertIsNone(build_widget("something_new", {}, {"x": 1}))

    def test_a_changed_tool_output_never_breaks_the_answer(self):
        """⚠️ ویجت افزوده است: شکلِ ناآشنا فقط ویجت را حذف می‌کند، نه کلِ پاسخ را."""
        with self.assertLogs("chat.widgets", level="ERROR"):
            self.assertIsNone(build_widget("debtors", {}, {"شکل_تازه": []}))

    def test_widgets_are_json_serializable(self):
        """ویجت در ستونِ JSON ذخیره و در SSE فرستاده می‌شود."""
        for name, arguments in [("overview", {}), ("customer_summary", {}), ("transaction_summary", {}),
                                ("debtors", {}), ("recent_transactions", {}), ("best_payers", {}),
                                ("customer_transactions", {"customer_id": self.reza.id})]:
            with self.subTest(tool=name):
                json.dumps(widget_for(self.owner, name, arguments), ensure_ascii=False)


@override_settings(**LLM)
class WidgetStreamTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.customer = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        make_transaction(self.owner, self.customer, debt=500_000)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.conversation.messages.create(role="user", body="بدهکارانم؟")

    def collect(self, *streams):
        calls = iter(streams)
        with patch("chat.engine._stream_model",
                   side_effect=lambda messages, model=None, tools=None: next(calls)(messages)):
            return list(answer_stream(self.owner, self.conversation, visual=True))

    def test_widget_arrives_before_the_answer_text(self):
        """قرارداد: ویجت همان لحظهٔ اجرای ابزار می‌رود، نه همراهِ متن در `done`.

        روی CPU متنِ جواب چند دقیقه بعد از ابزار می‌رسد؛ داده نباید منتظرش بماند.
        """
        events = self.collect(stream_of(tool_calls=tool_call("debtors")),
                              stream_of("یک", " نفر"))
        kinds = [kind for kind, _ in events]
        self.assertIn("widget", kinds)
        self.assertLess(kinds.index("tool"), kinds.index("widget"))
        self.assertLess(kinds.index("widget"), kinds.index("delta"))

    def test_same_call_twice_shows_one_widget(self):
        events = self.collect(stream_of(tool_calls=tool_call("debtors")),
                              stream_of(tool_calls=tool_call("debtors")),
                              stream_of("یک نفر"))
        self.assertEqual(sum(1 for kind, _ in events if kind == "widget"), 1)

    def test_widgets_never_reach_the_model(self):
        """⚠️ ویجت عکسِ لحظه برای کاربر است؛ تاریخچهٔ مدل فقط متن می‌گیرد.

        وگرنه همان دادهٔ کهنه‌ای که `Message` عمداً ذخیره نمی‌کند، از درِ پشتی
        به مدل برمی‌گشت.
        """
        self.conversation.messages.create(role="assistant", body="یک نفر.",
                                          widgets=[{"type": "table", "rows": [{"amount": 1}]}])
        history = _history(self.conversation)
        self.assertEqual(history[-1], {"role": "assistant", "content": "یک نفر."})


class WidgetPersistenceTests(APITestCase):
    """لوله‌کشیِ ویو — موتور جایگزین می‌شود.

    ⚠️ ویوِ استریم موتور را در تردِ جدا اجرا می‌کند و آن ترد دادهٔ کامیت‌نشدهٔ
    تست را نمی‌بیند، پس اینجا فقط رساندن و ذخیرهٔ ویجت سنجیده می‌شود. خودِ
    ساختنش با ابزارِ واقعی در `WidgetStreamTests` است.
    """
    WIDGET = {"type": "table", "title": "بدهکاران", "columns": [], "rows": []}

    def setUp(self):
        self.owner = make_owner()
        self.client.force_authenticate(self.owner)
        self.conversation = Conversation.objects.create(owner=self.owner)

    def fake_engine(self, _user, _conversation, visual=False):
        yield ("tool", "debtors")
        yield ("widget", self.WIDGET)
        yield ("delta", "یک نفر.")
        yield ("done", ("یک نفر.", ["debtors"], {}))

    def stream(self):
        with patch("chat.views.is_configured", return_value=True), \
                patch("chat.views.answer_stream", side_effect=self.fake_engine):
            response = self.client.post(reverse("api:conversation_stream", args=[self.conversation.id]),
                                        {"body": "بدهکارانم؟"}, format="json")
            return b"".join(response.streaming_content).decode()

    def test_widget_is_streamed_and_saved_with_the_answer(self):
        body = self.stream()
        self.assertIn("event: widget", body)

        assistant = self.conversation.messages.get(role="assistant")
        self.assertEqual(assistant.widgets, [self.WIDGET])
        # همان پیامِ نهایی هم ویجت را دارد، تا فرانت نسخهٔ موقت را با آن عوض کند
        done = [line for line in body.split("\n\n") if line.startswith("event: done")][0]
        payload = json.loads(done.split("data: ", 1)[1])
        self.assertEqual(payload["assistantMessage"]["widgets"], [self.WIDGET])

    def test_fork_keeps_the_widgets(self):
        self.stream()
        assistant = self.conversation.messages.get(role="assistant")
        response = self.client.post(reverse("api:conversation_fork", args=[self.conversation.id]),
                                    {"message_id": assistant.id}, format="json")
        fork = Conversation.objects.get(pk=response.json()["id"])
        self.assertEqual(fork.messages.get(role="assistant").widgets, [self.WIDGET])
