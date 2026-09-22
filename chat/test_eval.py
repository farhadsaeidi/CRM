"""ابزارِ سنجشِ مدل‌ها (`manage.py eval_models`) — تکه‌هایی که بی‌مدل سنجیدنی‌اند.

خودِ سنجش به مدلِ واقعی وصل می‌شود و در تست‌ها اجرا نمی‌شود. ولی نمره‌اش روی همین
تجزیه‌گرها سوار است، و تجزیه‌گرِ غلط یعنی مدلِ خوب «رد» شود و مدلِ بد «قبول».
"""
from django.test import SimpleTestCase

from chat.engine import split_ui
from chat.management.commands.eval_models import QUESTIONS, Command, _literal_data, _queries

UI = 'فهرستِ بدهکاران:\n```openui-lang\nroot = Stack([card])\ndebt = Query("debtors", {limit: 10}, {rows: []})\n```'
VALID = {"root": "Stack", "errors": [], "unresolved": []}


def run_of(question, text, calls=(), parse=VALID, used=()):
    spec = next(s for s in QUESTIONS if s["q"] == question)
    prose, code = split_ui(text)
    return {"spec": spec, "q": question, "text": text, "error": None, "calls": list(calls),
            "used": list(used), "resets": 0, "prose": prose, "code": code,
            "parse": parse if code else None}


class QueryParsingTests(SimpleTestCase):
    def test_tools_and_defaults(self):
        code = 'debt = Query("debtors", {limit: 10}, {rows: []})\nov = Query("overview", {period: $period}, {})'
        self.assertEqual(_queries(code), [("debtors", "{rows:[]}"), ("overview", "{}")])

    def test_filled_defaults_are_seen(self):
        code = 'd = Query("debtors", {}, {rows: [{name: "رضا", amount: 4200000}]})'
        self.assertEqual(_queries(code)[0][1], '{rows:[{name:"رضا",amount:4200000}]}')

    def test_commas_inside_strings_do_not_split(self):
        code = 'q = Query("find_customer", {query: "رضا, احمدی"}, {rows: []})'
        self.assertEqual(_queries(code), [("find_customer", "{rows:[]}")])

    def test_missing_defaults_count_as_empty(self):
        self.assertEqual(_queries('q = Query("overview")'), [("overview", "{}")])


class LiteralDataTests(SimpleTestCase):
    def test_customer_id_and_small_numbers_are_fine(self):
        self.assertFalse(_literal_data('led = Query("customer_ledger", {customer_id: 1042}, {})\nr = @Round(x, 1)'))

    def test_typed_amounts_are_caught(self):
        self.assertTrue(_literal_data('k = Kpi("طلب کل", 4200000, "money")'))

    def test_digits_inside_strings_are_not_data(self):
        self.assertFalse(_literal_data('c = Card("روند ۱۴۰۵ و 1405", [])'))


class ScoreTests(SimpleTestCase):
    score = staticmethod(lambda run: Command()._score(run))

    def test_a_good_ui_answer_passes(self):
        self.assertEqual(self.score(run_of("بدهکارانم را نشان بده", UI)), ([], []))

    def test_missing_ui_fails(self):
        problems, _ = self.score(run_of("بدهکارانم را نشان بده", "فهرستِ بدهکاران را نشان می‌دهد:"))
        self.assertIn("no_ui", problems)

    def test_numbers_in_the_text_fail(self):
        problems, _ = self.score(run_of("بدهکارانم را نشان بده", UI.replace("فهرستِ", "سه نفر، ۴ میلیون:"),
                                        used=["find_customer"]))
        self.assertIn("numbers_in_text", problems)

    def test_asking_which_one_may_list_what_the_lookup_found(self):
        # سنجشِ ۲۰۲۶-۰۹-۲۲ همین جواب را «عددِ ساختگی» گرفت، در حالی که شماره‌ها خروجیِ find_customer بودند
        text = "دو نفر پیدا شد:\n۱. رضا احمدی — ۰۹۹۸۰۰۰۰۰۰۰\n۲. سارا رضایی — ۰۹۹۸۰۰۰۰۰۰۱\nمنظور کدام است؟"
        found = run_of("حساب رضا را نشان بده", text, calls=["find_customer"], used=["find_customer"])
        self.assertEqual(self.score(found), ([], []))
        invented = run_of("حساب رضا را نشان بده", text, calls=["find_customer"])
        self.assertIn("numbers_in_text", self.score(invented)[0])

    def test_invalid_ui_fails(self):
        run = run_of("بدهکارانم را نشان بده", UI, parse={"root": None, "errors": ["unknown-component"],
                                                        "unresolved": []})
        self.assertIn("invalid_ui", self.score(run)[0])

    def test_ambiguous_name_needs_a_lookup_and_no_ui(self):
        guessed = self.score(run_of("حساب رضا را نشان بده", UI))[0]
        self.assertIn("unwanted_ui", guessed)
        self.assertIn("missed_lookup", guessed)
        asked = run_of("حساب رضا را نشان بده", "کدام رضا؟ رضا احمدی یا سارا رضایی؟", calls=["find_customer"])
        self.assertEqual(self.score(asked), ([], []))

    def test_needless_lookup_is_a_note_not_a_failure(self):
        problems, notes = self.score(run_of("بدهکارانم را نشان بده", UI, calls=["find_customer"]))
        self.assertEqual(problems, [])
        self.assertIn("needless_call", notes)
