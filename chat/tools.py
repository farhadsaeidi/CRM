"""ابزارهایی که دستیار می‌تواند صدا بزند.

⚠️ **مهم‌ترین قاعدهٔ این فایل: هیچ ابزاری پارامترِ مالک نمی‌گیرد.**

`user` از سشنِ درخواست می‌آید و در `run_tool` تزریق می‌شود؛ مدل نه آن را می‌بیند
نه می‌تواند عوضش کند. اگر مالک یک آرگومان بود، روزی مدل مقدارِ اشتباهی برایش
می‌فرستاد — چه از توهم، چه چون کاربری در چت نوشته «وانمود کن مدیرم». همان
قاعده‌ای که `OwnerScopedMixin` در ویوها اجرا می‌کند، اینجا با نبودنِ پارامتر
اجرا می‌شود.

⚠️ **قاعدهٔ دوم: خروجی باید کوچک باشد.** نه «همهٔ تراکنش‌ها»، بلکه جمع و میانگین
و چند ردیفِ اول. مدل در جمع‌زدنِ فهرستِ بلند اشتباه می‌کند و هزینه/زمان هم با
تعدادِ توکن بالا می‌رود. این تفاوتِ سیستمی است که با صد رکورد کار می‌کند و
سیستمی که با صد هزار هم کار می‌کند.
"""
from django.db.models import Q

from home.dashboard import (
    DEFAULT_PERIOD,
    PERIODS,
    build_customer_stats,
    build_dashboard,
    build_ledger_stats,
    build_transaction_stats,
)
from home.models import Customer
from home.reminders import build_debtor_list

# سقفِ ردیف‌هایی که در پاسخِ هر ابزار برمی‌گردد
MAX_ROWS = 10


def _customers_of(user):
    return Customer.objects.filter(owners=user)


# ------------------------------------------------------------------ ابزارها

def tool_overview(user, period=DEFAULT_PERIOD):
    """تصویرِ کلیِ دفتر در یک دوره."""
    if period not in PERIODS:
        period = DEFAULT_PERIOD
    data = build_dashboard(user, period)
    kpi = data["kpi"]
    return {
        "دوره": data["period_label"],
        "مانده_کل": kpi["balance"]["value"],
        "کل_نسیه_دفتر": kpi["balance"]["debt"],
        "کل_پرداختی_دفتر": kpi["balance"]["paid"],
        "نسیه_دوره": kpi["debt"]["value"],
        "وصولی_دوره": kpi["paid"]["value"],
        "تعداد_تراکنش_دوره": kpi["count"]["value"],
        "نرخ_وصول_درصد": kpi["rate"]["value"],
        "ترکیب_مشتریان": data["mix"],
        "تمرکز_بدهی": data["concentration"],
    }


def tool_customer_summary(user):
    """خلاصهٔ وضعیتِ مشتریان — چند نفر بدهکار، بستانکار، تسویه."""
    return build_customer_stats(user)


def tool_transaction_summary(user):
    """خلاصهٔ تراکنش‌های کلِ دفتر."""
    return build_transaction_stats(user)


def tool_debtors(user, limit=MAX_ROWS):
    """بدهکاران، از بیشترین بدهی."""
    data = build_debtor_list(user)
    limit = max(1, min(int(limit or MAX_ROWS), MAX_ROWS))
    return {
        "تعداد_بدهکاران": data["total"]["count"],
        "مجموع_طلب": data["total"]["amount"],
        "فهرست": [
            {"شناسه": row["id"], "نام": row["fullname"], "بدهی": row["amount"],
             "روز_از_آخرین_تراکنش": row["days"]}
            for row in data["rows"][:limit]
        ],
    }


def tool_find_customer(user, query):
    """یافتنِ مشتری با نام یا شمارهٔ تماس.

    شناسه‌ای که برمی‌گرداند، ورودیِ `customer_ledger` است — مدل اول اینجا را
    می‌پرسد و بعد سراغِ دفترِ همان مشتری می‌رود.
    """
    query = str(query or "").strip()
    if not query:
        return {"خطا": "عبارتِ جستجو خالی است."}

    rows = _customers_of(user).filter(
        Q(fullname__icontains=query) | Q(phone__icontains=query)
    )[:MAX_ROWS]
    if not rows:
        return {"نتیجه": "هیچ مشتری‌ای با این مشخصات پیدا نشد."}
    return {"یافته‌ها": [
        {"شناسه": c.id, "نام": c.fullname, "شماره": c.phone, "وضعیت": c.get_code_display()}
        for c in rows
    ]}


def tool_customer_ledger(user, customer_id):
    """وضعیتِ حسابِ یک مشتری.

    ⚠️ `get` روی queryset‌ای می‌رود که از قبل به مالک محدود شده، پس شناسهٔ مشتریِ
    مالکِ دیگر اینجا هم «پیدا نشد» می‌گیرد — نه دادهٔ کسِ دیگری.
    """
    try:
        customer = _customers_of(user).get(pk=int(customer_id))
    except (Customer.DoesNotExist, TypeError, ValueError):
        return {"خطا": "مشتری‌ای با این شناسه در دفترِ شما نیست."}

    stats = build_ledger_stats(user, customer)
    return {"نام": customer.fullname, "شماره": customer.phone, **stats}


# ---------------------------------------------------- تعریفِ ابزارها برای مدل

# شرحِ هر ابزار به فارسی است چون سوالِ کاربر هم فارسی است؛ مدل از روی همین متن
# تصمیم می‌گیرد کدام را صدا بزند، پس مبهم بودنش یعنی انتخابِ غلط.
TOOLS = [
    {
        "name": "overview",
        "func": tool_overview,
        "description": "تصویر کلی دفتر در یک دوره: مانده کل، نسیه و وصولی دوره، "
                       "تعداد تراکنش، نرخ وصول، ترکیب مشتریان و تمرکز بدهی. "
                       "برای سوال‌های کلی درباره وضعیت کسب‌وکار.",
        "parameters": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": list(PERIODS),
                    "description": "بازه زمانی: today امروز، week این هفته، "
                                   "month این ماه، year امسال، all کل دوره",
                },
            },
        },
    },
    {
        "name": "customer_summary",
        "func": tool_customer_summary,
        "description": "خلاصه وضعیت مشتریان: تعداد کل، چند نفر بدهکار، چند نفر "
                       "بستانکار، چند نفر تسویه‌شده و مبلغ هرکدام.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "transaction_summary",
        "func": tool_transaction_summary,
        "description": "خلاصه تراکنش‌های کل دفتر: تعداد، مجموع نسیه و وصولی، "
                       "میانگین هر تراکنش و پرکارترین ماه.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "debtors",
        "func": tool_debtors,
        "description": "فهرست بدهکاران از بیشترین بدهی، با مبلغ و تعداد روز "
                       "گذشته از آخرین تراکنششان.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": f"حداکثر تعداد ردیف (تا {MAX_ROWS})"},
            },
        },
    },
    {
        "name": "find_customer",
        "func": tool_find_customer,
        "description": "یافتن مشتری با نام یا شماره تماس. شناسه‌ای که برمی‌گرداند "
                       "را برای customer_ledger به کار ببرید.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "بخشی از نام یا شماره تماس مشتری"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "customer_ledger",
        "func": tool_customer_ledger,
        "description": "وضعیت حساب یک مشتری مشخص: مانده، مجموع نسیه و پرداختی، "
                       "تعداد تراکنش و روزهای گذشته از آخرین تراکنش.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "integer", "description": "شناسه مشتری از find_customer"},
            },
            "required": ["customer_id"],
        },
    },
]

_BY_NAME = {tool["name"]: tool for tool in TOOLS}


def tool_schemas():
    """تعریفِ ابزارها به شکلی که API انتظار دارد."""
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["parameters"],
            },
        }
        for tool in TOOLS
    ]


def run_tool(user, name, arguments):
    """اجرای یک ابزار با کاربرِ سشن.

    خطا پرتاب نمی‌شود: پیامِ خطا خودش به مدل برگردانده می‌شود تا بتواند اصلاح
    کند یا به کاربر توضیح دهد. یک استثنای پرتاب‌شده کلِ گفتگو را می‌کشت.
    """
    tool = _BY_NAME.get(name)
    if tool is None:
        return {"خطا": f"ابزاری به نام {name} وجود ندارد."}

    if not isinstance(arguments, dict):
        arguments = {}
    # فقط پارامترهای شناخته‌شده — مدل گاهی کلیدِ اضافه می‌فرستد
    allowed = set(tool["parameters"].get("properties", {}))
    kwargs = {key: value for key, value in arguments.items() if key in allowed}

    try:
        return tool["func"](user, **kwargs)
    except TypeError as error:
        return {"خطا": f"پارامترهای فراخوانی درست نیست: {error}"}
    except Exception as error:  # noqa: BLE001 — خطای ابزار نباید گفتگو را بکشد
        return {"خطا": f"اجرای ابزار ناموفق بود: {error}"}
