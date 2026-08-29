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
    JALALI_MONTHS,
    LIST_SIZE,
    PERIODS,
    build_customer_stats,
    build_dashboard,
    build_ledger_stats,
    build_transaction_stats,
)
from home.models import Customer, Transaction
from home.reminders import build_debtor_list

# سقفِ ردیف‌هایی که در پاسخِ هر ابزار برمی‌گردد
MAX_ROWS = 10


def _customers_of(user):
    return Customer.objects.filter(owners=user)


def _clamp(limit):
    return max(1, min(int(limit or MAX_ROWS), MAX_ROWS))


def _jalali(row):
    """تاریخِ شمسیِ یک تراکنش، در دو شکلِ آماده — تا مدل هیچ‌چیز *تبدیل* نکند.

    ⚠️ **هر تبدیلی که به مدل بسپاری، جایی اشتباه می‌شود.**

    اول سه ستونِ `year/month/day` جدا می‌رفت و مدل خودش سرِ هم می‌کرد. رشتهٔ
    آمادهٔ `1405/02/20` که ساخته شد، مدل **باز هم** تبدیل کرد و نوشت «۲۰ فروردین
    ۱۴۰۵» — ماهِ ۰۲ اردیبهشت است. مدل شمارهٔ ماه را به نام برمی‌گرداند چون
    فارسی‌زبان این‌طور حرف می‌زند، و در همان یک قدم اشتباه می‌کند.

    پس نامِ ماه را هم خودمان می‌دهیم. حالا هر دو شکلی که ممکن است لازم شود در
    خروجی هست و کارِ مدل فقط کپی کردن است.
    """
    if not (row.year and row.month and row.day):
        return None, None
    numeric = f"{row.year}/{row.month:02d}/{row.day:02d}"
    return numeric, f"{row.day} {JALALI_MONTHS[row.month - 1]} {row.year}"


def _transaction_row(row):
    numeric, spelled = _jalali(row)
    return {
        "مشتری": row.customer.fullname,
        "شناسه_مشتری": row.customer_id,
        "تاریخ_شمسی": numeric,
        "تاریخ_به_حروف": spelled,
        "نسیه": row.debt,
        "پرداختی": row.paid,
    }


# کلیدهایی که یعنی «ابزار اجرا شد ولی دادهٔ دفتری برنگشت».
# ⚠️ فهرستِ خالی جزوِ این‌ها **نیست**: «هیچ بدهکاری ندارید» خودش یک واقعیتِ
# دفتری است و مدل حق دارد رویش جواب بسازد.
_EMPTY_KEYS = {"خطا", "نتیجه"}


def has_data(result):
    """آیا خروجیِ این ابزار پشتوانهٔ عددیِ جواب هست؟

    ⚠️ **این تابع سوراخِ اصلیِ گاردِ قبلی را می‌بندد.** تا امروز موتور فقط
    می‌پرسید «ابزاری اجرا شد؟» — و مدل با یک `find_customer("آخرین تراکنش")` که
    هیچ‌چی پیدا نمی‌کرد، مجوزِ ساختنِ نام و تاریخ می‌گرفت. اجرا شدنِ ابزار
    پشتوانه نیست؛ **برگشتنِ داده** پشتوانه است.
    """
    if not isinstance(result, dict) or not result:
        return False
    return any(key not in _EMPTY_KEYS for key in result)


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
    limit = _clamp(limit)
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



def tool_recent_transactions(user, limit=MAX_ROWS):
    """تازه‌ترین تراکنش‌های کلِ دفتر، از جدید به قدیم."""
    rows = (Transaction.objects.filter(owner=user)
            .select_related("customer")
            .order_by("-created", "-id")[:_clamp(limit)])
    if not rows:
        return {"نتیجه": "هنوز هیچ تراکنشی در دفترِ شما ثبت نشده است."}
    return {
        "ترتیب": "از جدیدترین به قدیمی‌ترین",
        "تراکنش‌ها": [_transaction_row(row) for row in rows],
    }


def tool_customer_transactions(user, customer_id, limit=MAX_ROWS):
    """تازه‌ترین تراکنش‌های یک مشتریِ مشخص."""
    try:
        customer = _customers_of(user).get(pk=int(customer_id))
    except (Customer.DoesNotExist, TypeError, ValueError):
        return {"خطا": "مشتری‌ای با این شناسه در دفترِ شما نیست."}

    rows = (Transaction.objects.filter(owner=user, customer=customer)
            .select_related("customer")
            .order_by("-created", "-id")[:_clamp(limit)])
    if not rows:
        return {"نتیجه": f"برای {customer.fullname} هیچ تراکنشی ثبت نشده است."}
    return {
        "مشتری": customer.fullname,
        "ترتیب": "از جدیدترین به قدیمی‌ترین",
        "تراکنش‌ها": [_transaction_row(row) for row in rows],
    }


def tool_best_payers(user):
    """خوش‌حساب‌ترین مشتریان — بیشترین نسبتِ پرداخت به نسیه."""
    rows = build_dashboard(user)["best_payers"]
    if not rows:
        return {"نتیجه": "هنوز هیچ مشتری‌ای نسیه نگرفته، پس خوش‌حسابی معنا ندارد."}
    return {"فهرست": [
        {"شناسه": r["id"], "نام": r["fullname"], "درصد_پرداخت": r["ratio"],
         "کل_پرداختی": r["paid"], "کل_نسیه": r["debt"]}
        for r in rows
    ]}


def tool_dormant_customers(user):
    """مشتریانِ نیازمندِ پیگیری — مدت‌هاست تراکنشی نداشته‌اند."""
    data = build_dashboard(user)
    rows = data["dormant"]
    if not rows:
        return {"نتیجه": "همهٔ مشتریان به‌تازگی تراکنش داشته‌اند."}
    return {
        "تعداد_کل": data["dormant_total"],
        "فهرست": [
            {"شناسه": r["id"], "نام": r["fullname"],
             "روز_از_آخرین_تراکنش": r["days"],
             "هرگز_تراکنش_نداشته": r["never"]}
            for r in rows
        ],
    }


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
    {
        "name": "recent_transactions",
        "func": tool_recent_transactions,
        "description": "آخرین تراکنش‌های ثبت‌شده در کل دفتر، از جدید به قدیم، "
                       "همراه نام مشتری و تاریخ شمسی و مبلغ. برای هر سوالی درباره "
                       "«آخرین تراکنش»، «تازه‌ترین خرید»، «جدیدترین ثبت» یا "
                       "«اخیرا چه شده».",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": f"چند تراکنش (تا {MAX_ROWS})"},
            },
        },
    },
    {
        "name": "customer_transactions",
        "func": tool_customer_transactions,
        "description": "تراکنش‌های یک مشتری مشخص با تاریخ و مبلغ، از جدید به قدیم. "
                       "شناسه را اول با find_customer بگیرید. برای سوال‌هایی مثل "
                       "«فلانی کی خرید کرد» یا «تراکنش‌های فلانی را بگو».",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "integer", "description": "شناسه مشتری از find_customer"},
                "limit": {"type": "integer", "description": f"چند تراکنش (تا {MAX_ROWS})"},
            },
            "required": ["customer_id"],
        },
    },
    {
        "name": "best_payers",
        "func": tool_best_payers,
        "description": f"خوش‌حساب‌ترین مشتریان (تا {LIST_SIZE} نفر): کسانی که نسیه "
                       "گرفته‌اند و بیشترین نسبت پرداخت به نسیه را دارند.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "dormant_customers",
        "func": tool_dormant_customers,
        "description": f"مشتریان نیازمند پیگیری (تا {LIST_SIZE} نفر): کسانی که "
                       "مدت‌هاست تراکنشی نداشته‌اند یا هرگز تراکنشی نداشته‌اند.",
        "parameters": {"type": "object", "properties": {}},
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
