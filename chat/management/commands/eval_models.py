"""سنجشِ مدل‌های فهرست روی سوال‌های واقعیِ همین برنامه — درستی، سرعت و هزینه.

    venv/bin/python manage.py eval_models                          # همهٔ مدل‌ها، هر سوال دو بار
    venv/bin/python manage.py eval_models --models openai/gpt-4o-mini --runs 3 --out eval.json

⚠️ **به مدلِ واقعی وصل می‌شود و پول خرج می‌کند.** هزینهٔ هر جواب را خودِ OpenRouter
در پاسخ می‌گوید و گزارش همان را جمع می‌زند (در ۲۰۲۶-۰۹-۲۲ هر دورِ کامل روی شش مدل
حدودِ ۶ سنت شد).

⚠️ **هیچ چیزی در دیتابیس نمی‌ماند.** یک مالکِ موقت با دفترِ کوچکی ساخته می‌شود،
همهٔ گفتگوها زیرِ او می‌روند، و آخرِ کار کلِ تراکنش برگردانده می‌شود — حتی اگر
وسطِ کار خطا بدهد. برنامه در همان حال بالاست و این ردیف‌ها را هرگز نمی‌بیند.

چرا روی سوال‌های خودمان و نه یک بنچمارک؟ بنچمارکِ خودِ OpenUI روی کامپوننت‌های
دیگری سنجیده شده؛ آنچه اینجا مهم است این است که یک مدل با **همین** پرامپت و
**همین** کامپوننت‌ها رابطِ درست می‌سازد یا نه، و در متن عدد نمی‌سازد.
"""
import json
import re
import statistics
import subprocess
import tempfile
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from account.models import MyUser
from chat import engine
from chat.catalog import MODELS
from chat.models import Conversation
from chat.ui_tools import UI_TOOLS
from home.models import Customer, CustomerOwner, Transaction

# ⚠️ هر سوال یک رفتار را می‌پاید، نه فقط «جواب داد یا نه».
# ui: رابط لازم است (True)، نباید باشد (False)، یا فرقی ندارد (None).
# queries: ابزارهایی که رابط باید از `Query` بخواند. calls: function callِ لازم.
QUESTIONS = [
    {"q": "بدهکارانم را نشان بده", "ui": True, "queries": {"debtors"}},
    {"q": "وضع کلی دفترم چطور است؟", "ui": True, "queries": {"overview"}},
    {"q": "روند نسیه و وصولی را ماه به ماه نشان بده", "ui": True, "queries": {"monthly_trend"}},
    {"q": "ترکیب مشتریانم و سررسید بدهی‌ها را نشان بده", "ui": True,
     "queries": {"customer_mix", "debt_aging"}},
    {"q": "حساب رضا احمدی را نشان بده", "ui": True, "queries": {"customer_ledger"},
     "calls": {"find_customer"}},
    # دو نفر «رضا» دارند (رضا احمدی و سارا رضایی): باید بپرسد کدام، نه یکی را حدس بزند
    {"q": "حساب رضا را نشان بده", "ui": False, "calls": {"find_customer"}},
    {"q": "چه کسی را باید پیگیری کنم؟", "ui": True, "queries": {"dormant_customers"}},
    {"q": "آخرین تراکنش‌ها را نشان بده", "ui": True, "queries": {"recent_transactions"}},
    {"q": "خوش‌حساب‌ترین مشتریانم چه کسانی‌اند؟", "ui": True, "queries": {"best_payers"}},
    {"q": "چطور مشتری جدید اضافه کنم؟", "ui": False},
    # تله: سود از این دفتر حساب‌شدنی نیست. نباید عددی بسازد؛ رابط اختیاری است
    {"q": "سود خالص ماهانه‌ام چقدر است؟", "ui": None},
]

LEDGER = [("رضا احمدی", 5_400_000, 1_200_000), ("سارا رضایی", 850_000, 300_000),
          ("علی کریمی", 2_000_000, 2_000_000), ("مریم نوری", 3_100_000, 900_000),
          ("حسن مرادی", 0, 0)]

UI_TOOL_NAMES = {tool["name"] for tool in UI_TOOLS}

# مقدارِ پیش‌فرضِ Query فقط یکی از همین دو شکلِ خالی است (همان قاعدهٔ پرامپت)
EMPTY_DEFAULTS = {"{}", "{rows:[]}"}


def _unused_phone(model, prefix):
    number = 0
    while model.objects.filter(phone=f"{prefix}{number:07d}").exists():
        number += 1
    return f"{prefix}{number:07d}"


def _split_args(source):
    """آرگومان‌های سطحِ بالای یک فراخوانی، با رعایتِ آکولاد و کروشه و رشته."""
    args, depth, current, quote = [], 0, [], None
    for char in source:
        if quote:
            current.append(char)
            if char == quote:
                quote = None
            continue
        if char == '"':
            quote = char
        elif char in "{[(":
            depth += 1
        elif char in "}])":
            if depth == 0:
                break
            depth -= 1
        elif char == "," and depth == 0:
            args.append("".join(current).strip())
            current = []
            continue
        current.append(char)
    args.append("".join(current).strip())
    return args


def _queries(code):
    """[(ابزار، مقدارِ پیش‌فرض)] برای هر `Query(...)` در برنامه."""
    found = []
    for match in re.finditer(r"\bQuery\(", code):
        args = _split_args(code[match.end():])
        tool = args[0].strip('"') if args else ""
        found.append((tool, re.sub(r"\s+", "", args[2]) if len(args) > 2 else "{}"))
    return found


# عددِ چهاررقمی یا بیشترِ بیرونِ رشته — یعنی مدل داده را در کد تایپ کرده. شناسهٔ
# مشتری تنها عددِ مجاز است (از find_customer آمده)
_LITERAL = re.compile(r'(?<![\w.$])\d{4,}(?![\w.])')


def _literal_data(code):
    without_strings = re.sub(r'"(?:[^"\\]|\\.)*"', '""', code)
    without_ids = re.sub(r"customer_id:\s*\d+", "", without_strings)
    return bool(_LITERAL.search(without_ids))


class Command(BaseCommand):
    help = "سنجشِ مدل‌های فهرست روی سوال‌های واقعیِ برنامه (به مدلِ واقعی وصل می‌شود و هزینه دارد)"

    def add_arguments(self, parser):
        parser.add_argument("--models", default="", help="شناسه‌ها با کاما؛ خالی یعنی همهٔ فهرست")
        parser.add_argument("--runs", type=int, default=2, help="هر سوال چند بار")
        parser.add_argument("--out", default="", help="مسیرِ فایلِ JSON برای جزئیاتِ هر اجرا")

    def handle(self, *args, **options):
        models = [m for m in options["models"].split(",") if m] or [m["id"] for m in MODELS]
        with transaction.atomic():
            try:
                owner = self._seed()
                runs = [self._ask(owner, model, spec)
                        for model in models for spec in QUESTIONS for _ in range(options["runs"])]
            finally:
                # ⚠️ همیشه برمی‌گردد — این دستور دفترِ واقعی را آزمایشگاه نمی‌کند
                transaction.set_rollback(True)

        self._validate(runs)
        for run in runs:
            run["problems"], run["notes"] = self._score(run)
        self.stdout.write(self._report(models, runs))
        if options["out"]:
            Path(options["out"]).write_text(json.dumps(runs, ensure_ascii=False, indent=1, default=list),
                                            encoding="utf-8")

    # ------------------------------------------------------------- اجرا

    def _seed(self):
        owner = MyUser.objects.create_user(phone=_unused_phone(MyUser, "0999"), password="eval-only",
                                           fullname="سنجشِ مدل‌ها")
        for name, debt, paid in LEDGER:
            customer = Customer.objects.create(fullname=name, phone=_unused_phone(Customer, "0998"))
            CustomerOwner.objects.create(customer=customer, owner=owner)
            for amount, field in ((debt, "debt"), (paid, "paid")):
                if amount:
                    Transaction.objects.create(owner=owner, customer=customer, **{field: amount})
        return owner

    def _ask(self, owner, model, spec):
        conversation = Conversation.objects.create(owner=owner, model=model)
        conversation.messages.create(role="user", body=spec["q"])
        original, original_ui = engine._stream_model, engine.supports_ui
        # ⚠️ پرچمِ `ui` در فهرست **خروجیِ** همین سنجش است، نه ورودی‌اش: هر مدل در حالتِ
        # رابط سنجیده می‌شود، وگرنه مدلی که یک‌بار `False` شد با هیچ پرامپتِ بهتری
        # دیگر فرصتِ نشان دادنِ خودش را نداشت.
        engine.supports_ui = lambda _model: True
        # ⚠️ قطعیِ لحظه‌ایِ شبکه ایرادِ مدل نیست. در سنجشِ دومِ ۲۰۲۶-۰۹-۲۲ نام‌یابیِ DNS
        # وسطِ کار از دست رفت و پنجاه اجرای آخر همه «خطا» شمرده شدند؛ پس فقط خطای
        # اتصال یک بار، با مکث، تکرار می‌شود — نه خطای خودِ مدل.
        for attempt in range(2):
            usage, calls, resets, used = [], [], 0, []
            # هزینهٔ هر رفت‌وبرگشت را همان پاسخِ OpenRouter می‌گوید
            engine._stream_model = lambda messages, m=None, tools=None: original(
                messages, m, tools, on_usage=usage.append)
            started, first, text, error = time.monotonic(), None, "", None
            try:
                for kind, data in engine.answer_stream(owner, conversation, visual=True):
                    if kind == "delta" and first is None:
                        first = time.monotonic() - started
                    elif kind == "tool":
                        calls.append(data)
                    elif kind == "reset":
                        resets += 1
                    elif kind == "done":
                        text, used = data[0], data[1]
            except Exception as exc:  # noqa: BLE001 — خطای یک مدل نباید کلِ سنجش را بکشد
                error = str(exc)[:200]
            finally:
                engine._stream_model = original
            if not (error and "برقرار نشد" in error and attempt == 0):
                break
            time.sleep(5)
        engine.supports_ui = original_ui

        total = time.monotonic() - started
        run = {"model": model, "q": spec["q"], "spec": spec, "text": text, "error": error,
               "calls": calls, "used": used, "resets": resets, "first": first, "seconds": round(total, 1),
               "cost": sum(float(u.get("cost") or 0) for u in usage),
               "tokens": sum(int(u.get("total_tokens") or 0) for u in usage)}
        run["prose"], run["code"] = engine.split_ui(text)
        self.stderr.write(f"{model:32} {total:6.1f}s  {'ERR ' + error[:60] if error else ''}{spec['q']}")
        return run

    def _validate(self, runs):
        """برنامه‌ها را به پارسرِ خودِ OpenUI می‌دهد — `frontend/scripts/openui-validate.mjs`."""
        coded = [run for run in runs if run["code"]]
        if not coded:
            return
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
            json.dump([run["code"] for run in coded], handle, ensure_ascii=False)
        frontend = Path(settings.BASE_DIR) / "frontend"
        output = subprocess.run(["node", "scripts/openui-validate.mjs", handle.name], cwd=frontend,
                                capture_output=True, text=True, check=True).stdout
        Path(handle.name).unlink()
        for run, verdict in zip(coded, json.loads(output)):
            run["parse"] = verdict

    # ------------------------------------------------------------- نمره

    def _score(self, run):
        """(مشکل‌ها، یادداشت‌ها). مشکل یعنی جوابِ این اجرا قابلِ قبول نیست."""
        spec, code, problems, notes = run["spec"], run["code"], [], []
        if run["error"]:
            return ["error"], notes
        if engine.is_fallback(run["text"]) or not run["text"].strip():
            problems.append("refused")
        # عدد کنارِ رابط همیشه خطاست (رابط خودش نشانش می‌دهد)؛ بی‌رابط فقط وقتی که هیچ
        # ابزاری داده برنگرداند — «کدام رضا؟» با شمارهٔ دو نامزد، همان خروجیِ find_customer
        # است و موتور هم همین را می‌پذیرد
        if engine._ui_prose_has_numbers(run["prose"]) and (code or not run["used"]):
            problems.append("numbers_in_text")
        if spec["ui"] is True and not code:
            problems.append("no_ui")
        if spec["ui"] is False and code:
            problems.append("unwanted_ui")
        if code:
            parse = run.get("parse") or {}
            if not parse.get("root") or parse.get("errors") or parse.get("unresolved"):
                problems.append("invalid_ui")
            queries = _queries(code)
            used = {tool for tool, _ in queries}
            if used - UI_TOOL_NAMES:
                problems.append("unknown_tool")
            if not spec.get("queries", set()) <= used:
                problems.append("wrong_tools")
            if any(default not in EMPTY_DEFAULTS for _, default in queries):
                problems.append("filled_defaults")
            if _literal_data(code):
                problems.append("literal_data")
        if not spec.get("calls", set()) <= set(run["calls"]):
            problems.append("missed_lookup")
        # ناکارآمدی، نه خطا: جواب درست است ولی یک رفت‌وبرگشتِ بی‌دلیل خرج کرده
        if not spec.get("calls") and run["calls"]:
            notes.append("needless_call")
        if run["resets"]:
            notes.append("nudged")
        return problems, notes

    # ------------------------------------------------------------- گزارش

    def _report(self, models, runs):
        lines = ["", "| مدل | موفق | رابطِ معتبر | زمانِ میانه (ث) | هزینهٔ هر جواب ($) | خطا |",
                 "|---|---|---|---|---|---|"]
        for model in models:
            mine = [run for run in runs if run["model"] == model]
            ok = sum(1 for run in mine if not run["problems"])
            with_ui = [run for run in mine if run["code"]]
            valid = sum(1 for run in with_ui if "invalid_ui" not in run["problems"])
            answered = [run for run in mine if not run["error"]]
            median = statistics.median([run["seconds"] for run in answered]) if answered else 0
            cost = (sum(run["cost"] for run in answered) / len(answered)) if answered else 0
            lines.append(f"| {model} | {ok}/{len(mine)} | {valid}/{len(with_ui)} | {median:.1f} | "
                         f"{cost:.5f} | {sum(1 for run in mine if run['error'])} |")
        lines.append("")
        for run in runs:
            if run["problems"]:
                lines.append(f"- {run['model']} — {run['q']}: {', '.join(run['problems'])}"
                             + (f" ({run['error'][:80]})" if run["error"] else ""))
        lines.append(f"\nهزینهٔ کل: ${sum(run['cost'] for run in runs):.4f}")
        return "\n".join(lines)
