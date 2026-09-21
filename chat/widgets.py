"""ویجت‌های پاسخِ دستیار — نتیجهٔ هر ابزار به شکلِ کارت یا جدول، بالای متنِ جواب.

⚠️ **چرا این لایه لازم است:** در حلقهٔ ابزار، هر عددی که کاربر می‌خواند را مدل از
روی خروجیِ ابزار **دوباره تایپ کرده** است. یک رقمِ جابه‌جا یا دو ردیفِ قاطی‌شده
خطایی بی‌صداست که هیچ‌کدام از لایه‌های ایمنیِ `engine.py` نمی‌گیرد — آن‌ها فقط
عددِ *بی‌پشتوانه* را می‌شناسند، نه عددِ *اشتباه‌کپی‌شده* را. ویجت همان عددها را
مستقیم از خروجیِ ابزار نشان می‌دهد، پس مرجعِ عدد دیگر متنِ مدل نیست.

این فازِ صفرِ «رابطِ کاربریِ مولد» است (ایدهٔ `Query`ِ پروژهٔ OpenUI): مدل هنوز
شکلِ رابط را انتخاب نمی‌کند، ولی دیگر داده از مسیرِ او رد نمی‌شود.

⚠️ **ویجت از همان دیکشنری‌ای ساخته می‌شود که مدل دید**، نه از یک کوئریِ دوم؛ پس
متنِ جواب و ویجت هرگز دو عددِ متفاوت نشان نمی‌دهند.

⚠️ **شکلِ خروجی عمومی است و نامِ ابزار را نمی‌شناسد.** فرانت فقط دو شکل می‌فهمد:

    {"type": "stats", "title", "subtitle"?, "link"?,
     "items": [{"label", "value", "format", "unit"?, "tone"?, "badge"?, "sub"?}]}
    {"type": "table", "title", "subtitle"?, "link"?, "total"?,
     "columns": [{"key", "label", "kind", "tone"?, "bar"?, "empty"?}], "rows": [...]}

قالب‌بندیِ عدد (ارقامِ فارسی، جداکننده، «تومان») کارِ فرانت است نه اینجا — همان
قاعدهٔ بقیهٔ API: سرور عددِ خام می‌دهد. مقصدِ لینک هم **معنایی** است
(`"target": "ledger"`) نه مسیرِ URL، تا مسیرهای فرانت فقط در `lib/paths.js` بمانند.

⚠️ فقط مسیرِ **استریم** ویجت می‌سازد (`answer_stream`). مسیرِ غیراستریم پشتیبانِ
بی‌رابط است و فقط متن برمی‌گرداند.
"""
import logging

from .tools import has_data

logger = logging.getLogger(__name__)


def _status(balance):
    """وضعیتِ حسابِ یک مشتری از دیدِ خودِ مشتری — همان برچسب‌های جدول‌ها.

    مانده = پرداختی − نسیه؛ منفی یعنی مشتری بدهکار است.
    """
    if balance < 0:
        return {"text": "بدهکار", "tone": "debt"}
    if balance > 0:
        return {"text": "بستانکار", "tone": "credit"}
    return {"text": "بی‌حساب", "tone": "zero"}


def _book_balance(balance):
    """ماندهٔ کلِ دفتر از دیدِ **مالک** — همان کاشیِ داشبورد.

    ⚠️ برعکسِ `_status` است، چون اینجا خودِ صاحبِ دفتر خواننده است: وقتی
    مشتری‌ها روی هم بدهکارند، مالک «طلبکار» است. رنگِ عدد هم عمداً خنثی
    می‌ماند و فقط برچسب وضعیت را می‌گوید — همان تصمیمِ کاشیِ «ماندهٔ کل دفتر».
    """
    if balance < 0:
        badge = {"text": "طلبکار", "tone": None}
    elif balance > 0:
        badge = {"text": "بدهکار", "tone": None}
    else:
        badge = {"text": "بی‌حساب", "tone": None}
    return {"label": "ماندهٔ کل دفتر", "value": abs(balance), "format": "money", "badge": badge}


def _customer_id(arguments):
    """شناسهٔ مشتری از آرگومان‌های ابزار، برای لینکِ «دفتر حساب».

    ⚠️ فقط وقتی به کار می‌رود که خودِ ابزار داده برگردانده باشد — یعنی شناسه
    قبلاً در `_customers_of(user)` پیدا شده و مالِ همین مالک است. لینکِ مشتریِ
    دیگری ساخته نمی‌شود، و اگر هم ساخته می‌شد سرور ۴۰۴ می‌داد.
    """
    try:
        return int(arguments.get("customer_id"))
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------------ سازنده‌ها

def _overview(result, _arguments):
    return {
        "type": "stats",
        "title": "نمای کلی دفتر",
        "subtitle": result["دوره"],
        "items": [
            _book_balance(result["مانده_کل"]),
            {"label": "نسیهٔ دوره", "value": result["نسیه_دوره"], "format": "money", "tone": "debt"},
            {"label": "وصولیِ دوره", "value": result["وصولی_دوره"], "format": "money", "tone": "credit"},
            {"label": "تعداد تراکنش", "value": result["تعداد_تراکنش_دوره"], "format": "count"},
            {"label": "نرخ وصول", "value": result["نرخ_وصول_درصد"], "format": "percent"},
        ],
        "link": {"label": "داشبورد", "target": "dashboard"},
    }


def _customer_summary(result, _arguments):
    return {
        "type": "stats",
        "title": "وضعیت مشتریان",
        "items": [
            {"label": "کل مشتریان", "value": result["total"], "format": "count", "unit": "نفر"},
            {"label": "بدهکار", "value": result["debtors"]["count"], "format": "count", "unit": "نفر",
             "tone": "debt", "sub": {"value": result["debtors"]["amount"], "format": "money"}},
            {"label": "بستانکار", "value": result["creditors"]["count"], "format": "count", "unit": "نفر",
             "tone": "credit", "sub": {"value": result["creditors"]["amount"], "format": "money"}},
            {"label": "تسویه‌شده", "value": result["settled"], "format": "count", "unit": "نفر", "tone": "zero"},
            {"label": "بدون تراکنش", "value": result["untouched"], "format": "count", "unit": "نفر"},
        ],
        "link": {"label": "مشتریان", "target": "customers"},
    }


def _transaction_summary(result, _arguments):
    items = [
        {"label": "تعداد تراکنش", "value": result["total"], "format": "count"},
        {"label": "مجموع نسیه", "value": result["debt"]["amount"], "format": "money", "tone": "debt"},
        {"label": "مجموع وصولی", "value": result["paid"]["amount"], "format": "money", "tone": "credit"},
        {"label": "میانگین هر تراکنش", "value": result["average"], "format": "money"},
        {"label": "نرخ وصول", "value": result["rate"], "format": "percent"},
    ]
    busiest = result.get("busiest")
    if busiest:
        items.append({"label": "پرکارترین ماه", "value": f"{busiest['label']} {busiest['year']}",
                      "format": "text", "sub": {"value": busiest["count"], "format": "count", "unit": "تراکنش"}})
    return {"type": "stats", "title": "خلاصهٔ تراکنش‌ها", "items": items,
            "link": {"label": "همهٔ تراکنش‌ها", "target": "transactions"}}


def _debtors(result, _arguments):
    rows = [
        {"name": row["نام"], "customer_id": row["شناسه"], "amount": row["بدهی"],
         "days": row["روز_از_آخرین_تراکنش"]}
        for row in result["فهرست"]
    ]
    if not rows:
        return None
    total = result["تعداد_بدهکاران"]
    return {
        "type": "table",
        "title": "بدهکاران",
        "subtitle": f"{len(rows)} نفر از {total} نفر" if total > len(rows) else f"{total} نفر",
        "columns": [
            {"key": "name", "label": "مشتری", "kind": "customer"},
            {"key": "amount", "label": "بدهی (تومان)", "kind": "money", "bar": "debt"},
            {"key": "days", "label": "آخرین تراکنش", "kind": "days"},
        ],
        "rows": rows,
        "total": {"label": "مجموع طلب", "value": result["مجموع_طلب"], "format": "money"},
    }


def _find_customer(result, _arguments):
    """⚠️ فقط وقتی بیش از یک نفر پیدا شده.

    با یک نتیجه، `find_customer` فقط پلهٔ اولِ «ماندهٔ فلانی چقدر است؟» است و
    مدل بلافاصله سراغِ `customer_ledger` همان شخص می‌رود؛ جدولِ یک‌ردیفه بالای
    کارتِ حسابِ او فقط تکرار می‌شد. با چند نتیجه اما جدول به کاربر کمک می‌کند
    ببیند منظورش کدام بوده.
    """
    found = result.get("یافته‌ها") or []
    if len(found) < 2:
        return None
    return {
        "type": "table",
        "title": "مشتریانِ پیداشده",
        "subtitle": f"{len(found)} نفر",
        "columns": [
            {"key": "name", "label": "مشتری", "kind": "customer"},
            {"key": "phone", "label": "شماره تماس", "kind": "phone"},
            {"key": "status", "label": "وضعیت", "kind": "status"},
        ],
        "rows": [
            {"name": row["نام"], "customer_id": row["شناسه"], "phone": row["شماره"], "status": row["وضعیت"]}
            for row in found
        ],
    }


def _customer_ledger(result, arguments):
    balance = result["balance"]
    customer_id = _customer_id(arguments)
    return {
        "type": "stats",
        "title": result["نام"],
        "subtitle": result.get("شماره") or None,
        "items": [
            {"label": "مانده حساب", "value": abs(balance), "format": "money",
             "tone": _status(balance)["tone"], "badge": _status(balance)},
            {"label": "کل نسیه", "value": result["debt"]["amount"], "format": "money", "tone": "debt"},
            {"label": "کل پرداختی", "value": result["paid"]["amount"], "format": "money", "tone": "credit"},
            {"label": "تعداد تراکنش", "value": result["total"], "format": "count"},
            {"label": "آخرین تراکنش", "value": result["days_since_last"], "format": "days"},
        ],
        "link": ({"label": "دفتر حساب", "target": "ledger", "customer_id": customer_id}
                 if customer_id else None),
    }


_TRANSACTION_COLUMNS = [
    {"key": "date", "label": "تاریخ", "kind": "date"},
    {"key": "debt", "label": "نسیه (تومان)", "kind": "money", "tone": "debt"},
    {"key": "paid", "label": "پرداختی (تومان)", "kind": "money", "tone": "credit"},
]


def _transaction_rows(result):
    return [
        {"name": row["مشتری"], "customer_id": row["شناسه_مشتری"], "date": row["تاریخ_شمسی"],
         "debt": row["نسیه"], "paid": row["پرداختی"]}
        for row in result["تراکنش‌ها"]
    ]


def _recent_transactions(result, _arguments):
    rows = _transaction_rows(result)
    return {
        "type": "table",
        "title": "آخرین تراکنش‌ها",
        "subtitle": f"{len(rows)} تراکنشِ اخیر",
        "columns": [{"key": "name", "label": "مشتری", "kind": "customer"}, *_TRANSACTION_COLUMNS],
        "rows": rows,
        "link": {"label": "همهٔ تراکنش‌ها", "target": "transactions"},
    }


def _customer_transactions(result, arguments):
    rows = _transaction_rows(result)
    customer_id = _customer_id(arguments)
    return {
        "type": "table",
        "title": f"تراکنش‌های {result['مشتری']}",
        "subtitle": f"{len(rows)} تراکنشِ اخیر",
        # نامِ مشتری در عنوان هست؛ ستونِ تکراریِ همان نام در هر ردیف فقط جا می‌گرفت
        "columns": _TRANSACTION_COLUMNS,
        "rows": rows,
        "link": ({"label": "دفتر حساب", "target": "ledger", "customer_id": customer_id}
                 if customer_id else None),
    }


def _best_payers(result, _arguments):
    return {
        "type": "table",
        "title": "خوش‌حساب‌ترین مشتریان",
        "columns": [
            {"key": "name", "label": "مشتری", "kind": "customer"},
            {"key": "ratio", "label": "درصد پرداخت", "kind": "percent", "bar": "credit"},
            {"key": "paid", "label": "پرداختی (تومان)", "kind": "money"},
            {"key": "debt", "label": "نسیه (تومان)", "kind": "money"},
        ],
        "rows": [
            {"name": row["نام"], "customer_id": row["شناسه"], "ratio": row["درصد_پرداخت"],
             "paid": row["کل_پرداختی"], "debt": row["کل_نسیه"]}
            for row in result["فهرست"]
        ],
    }


def _dormant_customers(result, _arguments):
    rows = [
        {"name": row["نام"], "customer_id": row["شناسه"],
         # «هرگز» با `None` گفته می‌شود و برچسبش را ستون می‌دهد، نه یک رشتهٔ
         # فارسی در جای عدد — فرانت باید بتواند روی همین ستون حساب کند
         "days": None if row["هرگز_تراکنش_نداشته"] else row["روز_از_آخرین_تراکنش"]}
        for row in result["فهرست"]
    ]
    total = result["تعداد_کل"]
    return {
        "type": "table",
        "title": "نیازمندِ پیگیری",
        "subtitle": f"{len(rows)} نفر از {total} نفر" if total > len(rows) else f"{total} نفر",
        "columns": [
            {"key": "name", "label": "مشتری", "kind": "customer"},
            {"key": "days", "label": "آخرین تراکنش", "kind": "days", "empty": "بدون تراکنش"},
        ],
        "rows": rows,
    }


_BUILDERS = {
    "overview": _overview,
    "customer_summary": _customer_summary,
    "transaction_summary": _transaction_summary,
    "debtors": _debtors,
    "find_customer": _find_customer,
    "customer_ledger": _customer_ledger,
    "recent_transactions": _recent_transactions,
    "customer_transactions": _customer_transactions,
    "best_payers": _best_payers,
    "dormant_customers": _dormant_customers,
}


def build_widget(name, arguments, result):
    """ویجتِ نتیجهٔ یک ابزار، یا `None` اگر چیزی برای نشان دادن نیست.

    ⚠️ **هرگز پرتاب نمی‌کند.** ویجت افزوده است، نه شرطِ جواب: اگر روزی شکلِ
    خروجیِ یک ابزار عوض شد و سازنده‌اش جا ماند، جوابِ متنی باید سالم برسد و فقط
    ویجت نیاید — نه اینکه کلِ گفتگو با `KeyError` بمیرد. خطا لاگ می‌شود تا دیده
    شود.
    """
    builder = _BUILDERS.get(name)
    if builder is None or not has_data(result):
        return None
    try:
        return builder(result, arguments if isinstance(arguments, dict) else {})
    except (KeyError, TypeError, ValueError, IndexError):
        logger.exception("chat widget for %s failed; answering with text only", name)
        return None
