"""ابزارهای دادهٔ «رابطِ مولد» — داده‌ای که کارت‌ها و نمودارهای جوابِ دستیار از آن پر می‌شوند.

دو مصرف‌کننده دارند و **عمداً یک پیاده‌سازی**:

- مدل، در حالتِ رابط، همین‌ها را به‌عنوان ابزارِ function calling صدا می‌زند؛
- مرورگر، هر `Query("debtors", ...)` که مدل در رابط نوشته را از راهِ
  `POST /api/chat/query/` به همین‌ها می‌فرستد.

پس شکلی که مدل هنگامِ نوشتن می‌بیند دقیقاً همانی است که صفحه هنگامِ رندر می‌گیرد.

⚠️ **کلیدها انگلیسی‌اند، برخلافِ `tools.py`.** در OpenUI Lang دسترسی به فیلد با نقطه
است (`debt.rows.name`) و شناسهٔ غیرلاتین را نمی‌پذیرد. برچسب‌های فارسی در
*مقدارها*اند (`"بدهکار"`، `"مهر"`)، نه در کلیدها. `tools.py` دست نخورده ماند چون
مدلِ محلیِ ۷B روی همان کلیدهای فارسی تنظیم شده و تست‌هایش به آن‌ها قفل‌اند.

⚠️ **همان دو قاعدهٔ `tools.py`:** هیچ ابزاری پارامترِ مالک نمی‌گیرد (`user` از سشن
تزریق می‌شود) و هیچ ابزاری چیزی نمی‌نویسد. اینجا مهم‌تر هم هست: این ابزارها از
مرورگر هم صدا زده می‌شوند.
"""
import json
from pathlib import Path

from django.db.models import Q

# ⚠️ `_customer_rows` خصوصی است ولی تنها جایی است که وضعیتِ حساب را از تراکنش‌های
# **همین مالک** و در یک کوئری حساب می‌کند. `Customer.code` بینِ همهٔ مالکانِ یک
# مشتری مشترک است و برای این کار غلط است (همان قاعدهٔ داشبورد و یادآوری).
from home.dashboard import (
    DEFAULT_PERIOD,
    PERIODS,
    _customer_rows,
    build_customer_stats,
    build_dashboard,
    build_ledger_stats,
    build_transaction_stats,
)
from home.models import Customer, Transaction
from home.reminders import build_debtor_list
from home.services import account_code_from_remainder

# سقفِ ردیف‌ها — همان منطقِ `tools.py`: جدولِ ده‌ردیفه خوانا است، صدردیفه نه
MAX_ROWS = 10

NOT_FOUND = "مشتری‌ای با این شناسه در دفترِ شما نیست."


def _clamp(limit):
    try:
        return max(1, min(int(limit or MAX_ROWS), MAX_ROWS))
    except (TypeError, ValueError):
        return MAX_ROWS


def _status(balance):
    # همان برچسبی که جدول‌های برنامه نشان می‌دهند
    return account_code_from_remainder(balance).label


def _date(row):
    """تاریخِ شمسی به شکلِ `1405/02/20` — فرانت فقط ارقامش را فارسی می‌کند."""
    if not row or not (row.get("year") and row.get("month") and row.get("day")):
        return None
    return f"{row['year']}/{row['month']:02d}/{row['day']:02d}"


def _customer(user, customer_id):
    try:
        return Customer.objects.filter(owners=user).get(pk=int(customer_id))
    except (Customer.DoesNotExist, TypeError, ValueError):
        return None


# ------------------------------------------------------------------ ابزارها

def overview(user, period=DEFAULT_PERIOD):
    if period not in PERIODS:
        period = DEFAULT_PERIOD
    data = build_dashboard(user, period)
    kpi = data["kpi"]
    return {
        "period_label": data["period_label"],
        "receivable": data["debtors_total"]["amount"],
        "debtors_count": data["debtors_total"]["count"],
        "customers_count": data["customers_total"],
        "period_debt": kpi["debt"]["value"],
        "period_paid": kpi["paid"]["value"],
        "period_count": kpi["count"]["value"],
        "collection_rate": kpi["rate"]["value"],
    }


def monthly_trend(user):
    return {"rows": [
        {"label": row["label"], "year": row["year"], "debt": row["debt"],
         "paid": row["paid"], "balance": row["balance"]}
        for row in build_dashboard(user)["trend"]
    ]}


# ترتیب و برچسب همان دوناتِ داشبورد: «بی‌حساب» دو معنای جدا دارد
_MIX = (("debt", "بدهکار"), ("credit", "بستانکار"), ("settled", "تسویه‌شده"),
        ("untouched", "بدون تراکنش"))


def customer_mix(user):
    mix = build_dashboard(user)["mix"]
    return {"total": mix["total"],
            "rows": [{"label": label, "count": mix[key]} for key, label in _MIX]}


def debt_aging(user):
    return {"rows": build_dashboard(user)["aging"]}


def debtors(user, limit=MAX_ROWS):
    data = build_debtor_list(user)
    return {
        "count": data["total"]["count"],
        "total": data["total"]["amount"],
        "rows": [{"customer_id": row["id"], "name": row["fullname"], "amount": row["amount"],
                  "days": row["days"]}
                 for row in data["rows"][:_clamp(limit)]],
    }


def find_customer(user, query):
    query = str(query or "").strip()
    if not query:
        return {"error": "عبارتِ جستجو خالی است."}
    rows = (_customer_rows(user)
            .filter(Q(fullname__icontains=query) | Q(phone__icontains=query))
            .order_by("fullname")[:MAX_ROWS])
    found = [{"customer_id": r.id, "name": r.fullname, "phone": r.phone,
              "balance": r.total_paid - r.total_debt,
              "status": _status(r.total_paid - r.total_debt)} for r in rows]
    # «پیدا نشد» داده نیست؛ همان قاعدهٔ `has_data` در `tools.py`
    return {"found": bool(found), "rows": found}


def customer_ledger(user, customer_id):
    customer = _customer(user, customer_id)
    if customer is None:
        return {"found": False, "message": NOT_FOUND}
    stats = build_ledger_stats(user, customer)
    return {
        "found": True,
        "customer_id": customer.id,
        "name": customer.fullname,
        "phone": customer.phone,
        "status": _status(stats["balance"]),
        "balance": stats["balance"],
        # قدرِ مطلق برای کاشی: جهتش را `status` می‌گوید، نه علامتِ منفی
        "balance_amount": abs(stats["balance"]),
        "total_debt": stats["debt"]["amount"],
        "total_paid": stats["paid"]["amount"],
        "count": stats["total"],
        "average": stats["average"],
        "largest": stats["largest"],
        "collection_rate": stats["rate"],
        "days_since_last": stats["days_since_last"],
        "first_date": _date(stats["first"]),
        "last_date": _date(stats["last"]),
    }


def _transaction(row):
    return {"customer_id": row.customer_id, "name": row.customer.fullname,
            "date": _date({"year": row.year, "month": row.month, "day": row.day}),
            "debt": row.debt, "paid": row.paid}


def customer_transactions(user, customer_id, limit=MAX_ROWS):
    customer = _customer(user, customer_id)
    if customer is None:
        return {"found": False, "message": NOT_FOUND}
    rows = (Transaction.objects.filter(owner=user, customer=customer)
            .select_related("customer").order_by("-created", "-id")[:_clamp(limit)])
    return {"found": True, "customer_id": customer.id, "name": customer.fullname,
            "rows": [_transaction(row) for row in rows]}


def recent_transactions(user, limit=MAX_ROWS):
    rows = (Transaction.objects.filter(owner=user)
            .select_related("customer").order_by("-created", "-id")[:_clamp(limit)])
    return {"rows": [_transaction(row) for row in rows]}


def best_payers(user):
    return {"rows": [
        {"customer_id": r["id"], "name": r["fullname"], "ratio": r["ratio"],
         "paid": r["paid"], "debt": r["debt"]}
        for r in build_dashboard(user)["best_payers"]
    ]}


def dormant_customers(user):
    data = build_dashboard(user)
    return {"total": data["dormant_total"], "rows": [
        {"customer_id": r["id"], "name": r["fullname"], "days": r["days"], "never": r["never"]}
        for r in data["dormant"]
    ]}


def customer_summary(user):
    stats = build_customer_stats(user)
    return {
        "total": stats["total"],
        "debtors_count": stats["debtors"]["count"],
        "debtors_amount": stats["debtors"]["amount"],
        "creditors_count": stats["creditors"]["count"],
        "creditors_amount": stats["creditors"]["amount"],
        "settled": stats["settled"],
        "untouched": stats["untouched"],
    }


def transaction_summary(user):
    stats = build_transaction_stats(user)
    busiest = stats["busiest"]
    return {
        "count": stats["total"],
        "total_debt": stats["debt"]["amount"],
        "total_paid": stats["paid"]["amount"],
        "average": stats["average"],
        "largest": stats["largest"],
        "collection_rate": stats["rate"],
        "this_month_count": stats["this_month"]["count"],
        "busiest_month": f"{busiest['label']} {busiest['year']}" if busiest else None,
        "busiest_count": busiest["count"] if busiest else None,
        "days_since_last": stats["days_since_last"],
    }


# ----------------------------------------------------- تعریف برای مدل و مرورگر

INT, NUM, STR, BOOL = {"type": "integer"}, {"type": "number"}, {"type": "string"}, {"type": "boolean"}


def _obj(**props):
    return {"type": "object", "properties": props}


def _rows(**props):
    return {"type": "array", "items": _obj(**props)}


_LIMIT = {"limit": {"type": "integer", "description": f"rows to return, at most {MAX_ROWS}"}}
_CUSTOMER = {"customer_id": {"type": "integer", "description": "from find_customer"}}

UI_TOOLS = [
    {
        "name": "overview", "func": overview,
        "description": "Headline numbers of the whole ledger for a period. receivable is what "
                       "customers owe in total right now, whatever the period.",
        "parameters": _obj(period={"type": "string", "enum": list(PERIODS)}),
        "output": _obj(period_label=STR, receivable=INT, debtors_count=INT, customers_count=INT,
                       period_debt=INT, period_paid=INT, period_count=INT, collection_rate=NUM),
    },
    {
        "name": "monthly_trend", "func": monthly_trend,
        "description": "Debt and payments per month for the last twelve Jalali months, oldest "
                       "first. label is the Persian month name.",
        "parameters": _obj(),
        "output": _obj(rows=_rows(label=STR, year=INT, debt=INT, paid=INT, balance=INT)),
    },
    {
        "name": "customer_mix", "func": customer_mix,
        "description": "How many customers are debtors, creditors, settled, or have no "
                       "transaction. label is Persian, ready for a chart.",
        "parameters": _obj(),
        "output": _obj(total=INT, rows=_rows(label=STR, count=INT)),
    },
    {
        "name": "debt_aging", "func": debt_aging,
        "description": "Outstanding debt grouped by days since each debtor's last transaction.",
        "parameters": _obj(),
        "output": _obj(rows=_rows(label=STR, amount=INT, count=INT)),
    },
    {
        "name": "debtors", "func": debtors,
        "description": "Customers who owe money, largest debt first. days is days since their "
                       "last transaction.",
        "parameters": _obj(**_LIMIT),
        "output": _obj(count=INT, total=INT,
                       rows=_rows(customer_id=INT, name=STR, amount=INT, days=INT)),
    },
    {
        "name": "find_customer", "func": find_customer,
        "description": "Find customers by part of their name or phone number. Call it only "
                       "when the user names one specific customer, to get their customer_id.",
        "parameters": {**_obj(query={"type": "string"}), "required": ["query"]},
        "output": _obj(found=BOOL, rows=_rows(customer_id=INT, name=STR, phone=STR,
                                              balance=INT, status=STR)),
    },
    {
        "name": "customer_ledger", "func": customer_ledger,
        "description": "One customer's account. balance is paid minus debt, so negative means "
                       "the customer owes you; balance_amount is its absolute value and status "
                       "says which way it goes.",
        "parameters": {**_obj(**_CUSTOMER), "required": ["customer_id"]},
        "output": _obj(found=BOOL, customer_id=INT, name=STR, phone=STR, status=STR,
                       balance=INT, balance_amount=INT, total_debt=INT, total_paid=INT,
                       count=INT, average=INT, largest=INT, collection_rate=NUM,
                       days_since_last=INT, first_date=STR, last_date=STR),
    },
    {
        "name": "customer_transactions", "func": customer_transactions,
        "description": "One customer's latest transactions, newest first.",
        "parameters": {**_obj(**_CUSTOMER, **_LIMIT), "required": ["customer_id"]},
        "output": _obj(found=BOOL, customer_id=INT, name=STR,
                       rows=_rows(customer_id=INT, name=STR, date=STR, debt=INT, paid=INT)),
    },
    {
        "name": "recent_transactions", "func": recent_transactions,
        "description": "The latest transactions of the whole ledger, newest first.",
        "parameters": _obj(**_LIMIT),
        "output": _obj(rows=_rows(customer_id=INT, name=STR, date=STR, debt=INT, paid=INT)),
    },
    {
        "name": "best_payers", "func": best_payers,
        "description": "Customers who took credit and paid back the largest share; ratio is "
                       "the percent paid back.",
        "parameters": _obj(),
        "output": _obj(rows=_rows(customer_id=INT, name=STR, ratio=NUM, paid=INT, debt=INT)),
    },
    {
        "name": "dormant_customers", "func": dormant_customers,
        "description": "Customers with no transaction for a long time, or never. days is null "
                       "when never is true.",
        "parameters": _obj(),
        "output": _obj(total=INT, rows=_rows(customer_id=INT, name=STR, days=INT, never=BOOL)),
    },
    {
        "name": "customer_summary", "func": customer_summary,
        "description": "Customer counts: debtors and creditors with their amounts, settled "
                       "ones and ones with no transaction.",
        "parameters": _obj(),
        "output": _obj(total=INT, debtors_count=INT, debtors_amount=INT, creditors_count=INT,
                       creditors_amount=INT, settled=INT, untouched=INT),
    },
    {
        "name": "transaction_summary", "func": transaction_summary,
        "description": "Totals over every transaction of the ledger.",
        "parameters": _obj(),
        "output": _obj(count=INT, total_debt=INT, total_paid=INT, average=INT, largest=INT,
                       collection_rate=NUM, this_month_count=INT, busiest_month=STR,
                       busiest_count=INT, days_since_last=INT),
    },
]

_BY_NAME = {tool["name"]: tool for tool in UI_TOOLS}

# ⚠️ **در حالتِ رابط، مدل مستقیم فقط همین را صدا می‌زند.**
#
# بقیهٔ ابزارها فقط از راهِ `Query` در دسترس‌اند، یعنی مدل هرگز عددشان را نمی‌بیند.
# در آزمایشِ ۲۰۲۶-۰۹-۲۲ که همه‌شان function tool بودند، مدل برای «وضعِ کلی؟»
# `overview` را صدا زد و هفت عدد را در متن ردیف کرد، به‌جای ساختنِ رابط. عددی که
# از دستِ مدل رد نشود، نمی‌تواند غلط کپی شود. شناسهٔ مشتری اما باید پیش از نوشتنِ
# رابط معلوم باشد (`customer_ledger` بدونِ آن معنا ندارد)، پس این یکی می‌ماند.
FUNCTION_TOOLS = ("find_customer",)


def is_ui_tool(name):
    return name in _BY_NAME


def ui_tool_schemas():
    """ابزارهایی که مدل در حالتِ رابط مستقیم صدا می‌زند، به شکلی که API انتظار دارد."""
    return [
        {"type": "function",
         "function": {"name": t["name"], "description": t["description"],
                      "parameters": t["parameters"]}}
        for t in UI_TOOLS if t["name"] in FUNCTION_TOOLS
    ]


def run_ui_tool(user, name, arguments):
    """اجرای یک ابزار با کاربرِ سشن — هم برای مدل هم برای مرورگر.

    مثلِ `run_tool` خطا پرتاب نمی‌کند: `{"error": ...}` برمی‌گرداند تا نه گفتگو
    بمیرد نه صفحه.
    """
    tool = _BY_NAME.get(name)
    if tool is None:
        return {"error": f"ابزاری به نام {name} وجود ندارد."}
    if not isinstance(arguments, dict):
        arguments = {}
    # فقط پارامترهای شناخته‌شده — نه مدل نه مرورگر نمی‌توانند کلیدِ دیگری بفرستند
    allowed = set(tool["parameters"].get("properties", {}))
    kwargs = {key: value for key, value in arguments.items() if key in allowed}
    try:
        return tool["func"](user, **kwargs)
    except TypeError as error:
        return {"error": f"پارامترهای فراخوانی درست نیست: {error}"}
    except Exception as error:  # noqa: BLE001 — خطای ابزار نباید گفتگو یا صفحه را بکشد
        return {"error": f"اجرای ابزار ناموفق بود: {error}"}


def ui_has_data(result):
    """همان پرسشِ `has_data`: آیا چیزی از دفتر برگشت؟

    فهرستِ خالی داده است («بدهکاری ندارید» یک واقعیت است)؛ «پیدا نشد» و خطا نه.
    """
    return (isinstance(result, dict) and bool(result) and "error" not in result
            and result.get("found", True) is not False)


# ------------------------------------------------------------------ پرامپت

def _type(schema):
    """نوعِ یک اسکیمای JSON به همان نگارشِ امضاهای پرامپتِ OpenUI."""
    if "enum" in schema:
        return " | ".join(json.dumps(value) for value in schema["enum"])
    kind = schema.get("type")
    if kind == "object":
        fields = ", ".join(f"{key}: {_type(value)}"
                           for key, value in schema.get("properties", {}).items())
        return f"{{{fields}}}"
    if kind == "array":
        return f"{_type(schema.get('items', {}))}[]"
    return {"integer": "number", "number": "number", "string": "string",
            "boolean": "boolean"}.get(kind, "any")


def _default(output):
    """مقدارِ پیش‌فرضِ Query: یا `{}` یا `{rows: []}`.

    ⚠️ **خالی، نه صفر.** اگر Query شکست بخورد پیش‌فرض روی صفحه می‌ماند؛ «۰ تومان»
    عددی غلط است که درست به نظر می‌رسد، ولی خانهٔ خالی («—») فقط می‌گوید چیزی نیامده.
    """
    return "{rows: []}" if "rows" in output.get("properties", {}) else "{}"


def _tools_section():
    lines = [
        "## Available Tools",
        "",
        "Use these with Query(). Every tool is read-only and already limited to this user's "
        "own ledger. Only find_customer is also a function tool, so you can learn a "
        "customer_id before writing the UI; everything else is shown through Query().",
        "",
    ]
    for tool in UI_TOOLS:
        args = ", ".join(
            f"{key}{'' if key in tool['parameters'].get('required', []) else '?'}: {_type(value)}"
            for key, value in tool["parameters"].get("properties", {}).items()
        )
        lines.append(f"- {tool['name']}({args}) → {_type(tool['output'])}")
        lines.append(f"  {tool['description']}")
    lines += ["", "### Default values for Query results", "",
              "Use exactly these as the Query defaults:"]
    lines += [f"- {tool['name']}: `{_default(tool['output'])}`" for tool in UI_TOOLS]
    lines += ["", "CRITICAL: Use ONLY the tools listed above in Query(). Never invent a tool name."]
    return "\n".join(lines)


_PROMPT_FILE = Path(__file__).resolve().parent / "openui" / "prompt.txt"


def ui_prompt():
    """بخشِ «رابطِ مولد» از پرامپتِ سیستم: زبان و کامپوننت‌ها + ابزارها.

    نیمهٔ اول از `prompt.txt` می‌آید که `npm run openui:prompt` از روی کامپوننت‌های
    فرانت ساخته؛ نیمهٔ دوم همین‌جا از `UI_TOOLS`. هر کدام یک منبع دارند.
    """
    return f"{_PROMPT_FILE.read_text(encoding='utf-8').strip()}\n\n{_tools_section()}"
