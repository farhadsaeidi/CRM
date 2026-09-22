"""رابطی که مدل می‌سازد (OpenUI) — ابزارهای داده، endpointِ Query و حالتِ رابطِ موتور.

⚠️ مثل بقیهٔ تست‌های موتور، هیچ‌کدام به مدلِ واقعی وصل نمی‌شوند. ابزارها با
دادهٔ **واقعیِ** ساخته‌شده سنجیده می‌شوند: پرامپت همین اسکیماها را به مدل می‌دهد و
مدل از رویشان `q.rows.name` می‌نویسد، پس ابزاری که شکلش از اسکیمایش جدا شود
رابطی می‌سازد که بی‌صدا خالی می‌ماند.
"""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.engine import (GROUNDING_REFUSAL, UI_GROUNDING_NUDGE, UI_PLACEHOLDER, _history,
                         answer_stream, split_ui)
from chat.models import Conversation
from chat.tools import TOOLS
from chat.ui_tools import UI_TOOLS, run_ui_tool, ui_has_data, ui_prompt, ui_tool_schemas
from home.models import CustomerOwner
from home.tests.factories import make_customer, make_owner, make_transaction

from .test_stream import LLM, stream_of, tool_call

# یک ردیفِ فهرستِ مدل‌ها — همین حالتِ رابط را روشن می‌کند. مدلِ `.env` در تست‌ها
# `"test"` است (بیرونِ فهرست)، پس بقیهٔ تست‌ها مسیرِ متن را می‌روند.
UI_MODEL = "openai/gpt-4o-mini"

UI_ANSWER = 'این هم بدهکاران:\n```openui-lang\nroot = Stack([card])\ndebt = Query("debtors", {limit: 10}, {rows: []})\n```'
CODE_ONLY = "```openui-lang\nroot = Stack([])\n```"


class LedgerMixin:
    def make_ledger(self):
        self.owner = make_owner()
        self.stranger = make_owner()
        self.reza = make_customer(self.owner, "رضا احمدی", phone="09121110001")
        self.sara = make_customer(self.owner, "سارا رضایی", phone="09121110002")
        # بی‌تراکنش: تا فهرستِ «نیازمندِ پیگیری» هم ردیف داشته باشد
        make_customer(self.owner, "حسن مرادی", phone="09121110003")
        make_transaction(self.owner, self.reza, debt=500_000)
        make_transaction(self.owner, self.reza, paid=200_000)
        make_transaction(self.owner, self.sara, debt=100_000)
        self.foreign = make_customer(self.stranger, "مشتری غریبه", phone="09121110009")
        make_transaction(self.stranger, self.foreign, debt=900_000)


class UiToolTests(LedgerMixin, APITestCase):
    def setUp(self):
        self.make_ledger()

    def test_every_output_matches_its_schema(self):
        """⚠️ کلید به کلید، هم در سطحِ بالا هم در هر ردیف."""
        args = {"find_customer": {"query": "رضا"},
                "customer_ledger": {"customer_id": self.reza.id},
                "customer_transactions": {"customer_id": self.reza.id}}
        for tool in UI_TOOLS:
            with self.subTest(tool=tool["name"]):
                result = run_ui_tool(self.owner, tool["name"], args.get(tool["name"], {}))
                props = tool["output"]["properties"]
                self.assertEqual(set(result), set(props))
                if "rows" in props:
                    self.assertTrue(result["rows"], "ردیفی نیامد؛ داده‌ی تست باید پوششش بدهد")
                    self.assertEqual(set(result["rows"][0]), set(props["rows"]["items"]["properties"]))

    def test_no_tool_takes_an_owner(self):
        """همان قاعدهٔ `tools.py`: مالک از سشن می‌آید، و اینجا مرورگر هم صدا می‌زند."""
        for tool in UI_TOOLS:
            self.assertFalse({"owner", "user", "owner_id"} & set(tool["parameters"].get("properties", {})))

    def test_unknown_arguments_are_dropped(self):
        result = run_ui_tool(self.owner, "debtors", {"limit": 1, "owner": self.stranger.id})
        self.assertNotIn("error", result)
        self.assertEqual([row["name"] for row in result["rows"]], ["رضا احمدی"])

    def test_other_owners_customer_is_not_found(self):
        for name in ("customer_ledger", "customer_transactions"):
            with self.subTest(tool=name):
                result = run_ui_tool(self.owner, name, {"customer_id": self.foreign.id})
                self.assertIs(result["found"], False)
                self.assertNotIn("name", result)

    def test_find_customer_sees_only_own_customers(self):
        self.assertEqual(run_ui_tool(self.owner, "find_customer", {"query": "غریبه"}),
                         {"found": False, "rows": []})

    def test_status_comes_from_this_owners_transactions(self):
        """⚠️ نه از `Customer.code` که بینِ مالکانِ یک مشتری مشترک است."""
        CustomerOwner.objects.create(customer=self.reza, owner=self.stranger)
        make_transaction(self.stranger, self.reza, paid=50_000)
        mine = run_ui_tool(self.owner, "find_customer", {"query": "رضا"})["rows"][0]
        theirs = run_ui_tool(self.stranger, "find_customer", {"query": "رضا"})["rows"][0]
        self.assertEqual((mine["status"], mine["balance"]), ("بدهکار", -300_000))
        self.assertEqual((theirs["status"], theirs["balance"]), ("بستانکار", 50_000))

    def test_has_data(self):
        self.assertFalse(ui_has_data({"found": False, "rows": []}))
        self.assertFalse(ui_has_data({"error": "x"}))
        # فهرستِ خالی واقعیتِ دفتری است، نه «پیدا نشد»
        self.assertTrue(ui_has_data({"rows": []}))

    def test_the_model_calls_only_find_customer(self):
        """⚠️ بقیه فقط از راهِ Query — عددی که از دستِ مدل رد نشود غلط کپی نمی‌شود."""
        self.assertEqual([s["function"]["name"] for s in ui_tool_schemas()], ["find_customer"])


class UiQueryViewTests(LedgerMixin, APITestCase):
    url = reverse("api:chat_query")

    def setUp(self):
        self.make_ledger()

    def test_guest_is_refused(self):
        response = self.client.post(self.url, {"tool": "debtors"}, format="json")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_returns_tool_data(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {"tool": "debtors", "args": {}}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.json()["count"], response.json()["total"]), (2, 400_000))

    def test_unknown_tool_is_400(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {"tool": "drop_everything"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_other_owner_gets_nothing(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.post(self.url, {"tool": "customer_ledger",
                                               "args": {"customer_id": self.reza.id}}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json()["found"], False)
        self.assertNotIn("رضا", response.content.decode())

    def test_tool_error_is_400(self):
        """خطا ۴۰۰ است تا Query در مرورگر شکست بخورد، نه اینکه شیءِ خطا جای داده بنشیند."""
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {"tool": "find_customer", "args": {"query": ""}},
                                    format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_args_must_be_an_object(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {"tool": "debtors", "args": "limit=1"}, format="json")
        self.assertEqual(response.status_code, 200)


@override_settings(**LLM)
class EngineUiModeTests(LedgerMixin, APITestCase):
    def setUp(self):
        self.make_ledger()
        self.conversation = Conversation.objects.create(owner=self.owner, model=UI_MODEL)
        self.conversation.messages.create(role="user", body="بدهکارانم؟")

    def run_with(self, *streams, visual=True):
        """رویدادها + آنچه هر بار به مدل رفت. پیش‌فرض «نمایش هوشمند» روشن است."""
        calls, seen = iter(streams), []

        def fake(messages, model=None, tools=None):
            seen.append({"messages": list(messages), "tools": tools})
            return next(calls)(messages)

        with patch("chat.engine._stream_model", side_effect=fake):
            events = list(answer_stream(self.owner, self.conversation, visual=visual))
        return events, seen

    @staticmethod
    def final(events):
        return next(data for kind, data in events if kind == "done")[0]

    def test_cloud_models_get_the_ui_prompt_and_only_find_customer(self):
        _events, seen = self.run_with(stream_of("سلام"))
        system = seen[0]["messages"][0]["content"]
        self.assertIn("## Generative UI", system)
        self.assertIn("## Available Tools", system)
        self.assertEqual([t["function"]["name"] for t in seen[0]["tools"]], ["find_customer"])

    def test_the_local_model_keeps_the_text_path(self):
        self.conversation.model = ""
        self.conversation.save()
        _events, seen = self.run_with(stream_of("سلام"))
        self.assertNotIn("Generative UI", seen[0]["messages"][0]["content"])
        self.assertEqual([t["function"]["name"] for t in seen[0]["tools"]], [t["name"] for t in TOOLS])

    def test_smart_view_off_means_text_only(self):
        """⚠️ «نمایش هوشمند» خاموش: متنِ خالی، حتی با مدلِ رابط‌ساز — نه رابط، نه کارتِ ثابت."""
        events, seen = self.run_with(stream_of(tool_calls=tool_call("debtors")), stream_of("دو نفر."),
                                     visual=False)
        self.assertNotIn("Generative UI", seen[0]["messages"][0]["content"])
        self.assertEqual([t["function"]["name"] for t in seen[0]["tools"]], [t["name"] for t in TOOLS])
        self.assertNotIn("widget", [kind for kind, _ in events])

    def test_smart_view_on_with_a_model_that_cannot_build_ui_shows_fixed_widgets(self):
        """روشن کردنِ گزینه با هر مدلی خروجیِ تصویری می‌دهد؛ مدلِ بی‌رابط، کارتِ ثابت."""
        self.conversation.model = "openai/gpt-4.1-nano"   # در سنجش رد شد: `ui: False`
        self.conversation.save()
        events, seen = self.run_with(stream_of(tool_calls=tool_call("debtors")), stream_of("دو نفر."))
        self.assertNotIn("Generative UI", seen[0]["messages"][0]["content"])
        self.assertIn("widget", [kind for kind, _ in events])

    def test_digits_inside_the_ui_code_are_not_claims(self):
        events, seen = self.run_with(stream_of(UI_ANSWER))
        self.assertEqual(len(seen), 1)
        self.assertEqual(self.final(events), UI_ANSWER)

    def test_numbers_in_the_prose_get_one_nudge(self):
        bad = f"شما ۲ بدهکار دارید.\n{CODE_ONLY}"
        events, seen = self.run_with(stream_of(bad), stream_of(UI_ANSWER))
        self.assertEqual(len(seen), 2)
        self.assertEqual(seen[1]["messages"][-1], {"role": "user", "content": UI_GROUNDING_NUDGE})
        self.assertIn("reset", [kind for kind, _ in events])
        self.assertEqual(self.final(events), UI_ANSWER)

    def test_spelled_out_numbers_count_too(self):
        """در آزمایشِ زنده مدل مانده را با حروف زیرِ رابط تکرار کرد و گاردِ رقم ندیدش."""
        bad = f"مانده‌اش چهار میلیون تومان است.\n{CODE_ONLY}"
        _events, seen = self.run_with(stream_of(bad), stream_of(UI_ANSWER))
        self.assertEqual(len(seen), 2)

    def test_refusal_keeps_the_ui_and_drops_the_prose(self):
        """⚠️ عددهای رابط را مرورگر از Query می‌خواند؛ ایرادِ متن به آن سرایت نمی‌کند."""
        bad = f"شما ۲ بدهکار دارید.\n{CODE_ONLY}"
        events, _seen = self.run_with(stream_of(bad), stream_of(bad))
        self.assertEqual(self.final(events), CODE_ONLY)

    def test_prose_without_ui_is_refused_as_before(self):
        events, _seen = self.run_with(stream_of("شما ۲ بدهکار دارید."), stream_of("شما ۲ بدهکار دارید."))
        self.assertEqual(self.final(events), GROUNDING_REFUSAL)

    def test_other_tools_are_not_function_calls(self):
        """نجات‌دهنده‌ها هر نامی را از متن بیرون می‌کشند؛ مرزِ `FUNCTION_TOOLS` دوباره اجرا می‌شود."""
        with patch("chat.engine.run_ui_tool") as spy:
            _events, seen = self.run_with(stream_of(tool_calls=tool_call("overview")), stream_of("باشد"))
        spy.assert_not_called()
        self.assertIn("only available through Query", seen[1]["messages"][-1]["content"])

    def test_no_fixed_widgets_in_ui_mode(self):
        events, _seen = self.run_with(stream_of(tool_calls=tool_call("find_customer", '{"query": "رضا"}')),
                                      stream_of("کدام رضا؟"))
        kinds = [kind for kind, _ in events]
        self.assertIn("tool", kinds)
        self.assertNotIn("widget", kinds)

    def test_history_keeps_ui_code_only_for_ui_models(self):
        """مدلِ محلی کدِ رابط نمی‌بیند؛ از رویش فقط یاد می‌گرفت کد بنویسد."""
        self.conversation.messages.create(role="assistant", body=UI_ANSWER)
        self.conversation.messages.create(role="assistant", body=CODE_ONLY)
        kept, stripped = _history(self.conversation, keep_ui=True), _history(self.conversation)
        self.assertEqual(kept[-2]["content"], UI_ANSWER)
        self.assertEqual(stripped[-2]["content"], "این هم بدهکاران:")
        self.assertEqual(stripped[-1]["content"], UI_PLACEHOLDER)


class SmartViewFlagTests(APITestCase):
    """ویوِ استریم پرچمِ «نمایش هوشمند» را فقط با `true`ِ صریح روشن می‌کند."""

    def setUp(self):
        self.owner = make_owner()
        self.client.force_authenticate(self.owner)
        self.conversation = Conversation.objects.create(owner=self.owner)
        self.seen = []

    def fake_engine(self, _user, _conversation, visual=False):
        self.seen.append(visual)
        yield ("delta", "باشد.")
        yield ("done", ("باشد.", [], {}))

    def send(self, **extra):
        with patch("chat.views.is_configured", return_value=True), \
                patch("chat.views.answer_stream", side_effect=self.fake_engine):
            response = self.client.post(reverse("api:conversation_stream", args=[self.conversation.id]),
                                        {"body": "سلام", **extra}, format="json")
            b"".join(response.streaming_content)

    def test_only_an_explicit_true_turns_it_on(self):
        self.send(visual=True)
        self.send()
        self.send(visual="true")
        self.assertEqual(self.seen, [True, False, False])


class SplitUiTests(SimpleTestCase):
    def test_fenced(self):
        self.assertEqual(split_ui(UI_ANSWER)[0], "این هم بدهکاران:")
        self.assertTrue(split_ui(UI_ANSWER)[1].startswith("root = Stack"))

    def test_missing_fence_starts_at_root(self):
        self.assertEqual(split_ui("مقدمه\nroot = Stack([])"), ("مقدمه", "root = Stack([])"))

    def test_plain_text(self):
        self.assertEqual(split_ui("سلام"), ("سلام", None))

    def test_unclosed_fence_while_streaming(self):
        self.assertEqual(split_ui("این:\n```openui-lang\nroot = St"), ("این:", "root = St"))


class UiPromptTests(SimpleTestCase):
    """⚠️ پرامپت از `defs.js` ساخته و کامیت می‌شود (`npm run openui:prompt`)."""

    def test_lists_every_tool_and_component(self):
        prompt = ui_prompt()
        for tool in UI_TOOLS:
            self.assertIn(f"- {tool['name']}(", prompt)
        for component in ("Stack(", "Card(", "KpiGrid(", "Kpi(", "Table(", "CustomerCol(", "Col(",
                          "BarChart(", "LineChart(", "DonutChart(", "Series(", "Select(", "Option(", "Note("):
            self.assertIn(component, prompt)

    def test_mentions_no_component_we_do_not_render(self):
        prompt = ui_prompt()
        for stray in ("FormControl(", "Button(", "SelectItem(", "Mutation(", "RootComp("):
            self.assertNotIn(stray, prompt)

    def test_never_asks_for_real_data_in_defaults(self):
        """⚠️ جمله‌های خطرناکِ پرامپتِ پیش‌فرضِ کتابخانه باید جایگزین شده باشند."""
        prompt = ui_prompt()
        self.assertNotIn("condensed Query defaults", prompt)
        self.assertNotIn("mock data instead", prompt)
