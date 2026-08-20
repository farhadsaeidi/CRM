"""منطقِ دامنه — بازمحاسبهٔ وضعیت حساب و ساختِ کوئریِ فیلتر و جستجوی تاریخ.

عمداً از سریالایزرها و ویوها جداست: در پروژهٔ قدیمی بازمحاسبهٔ وضعیت، عارضهٔ جانبیِ
تابعی بود که کارش سریالایز کردن بود و با یک پرچم روشن/خاموش می‌شد — که باعث می‌شد
با فیلترِ دوره، مجموعِ ناقص در جدولِ مشتری بنشیند.
"""
from functools import reduce

import jdatetime
from django.db.models import Q, Sum
from django.utils import timezone

from .models import AccountCode


def account_code_from_remainder(remainder):
    if remainder > 0:
        return AccountCode.CREDIT
    if remainder < 0:
        return AccountCode.DEBT
    return AccountCode.ZERO


def calculate_remainder(customer, owner):
    """مانده = مجموع پرداختی − مجموع نسیه، فقط روی تراکنش‌های همین مالک.

    یک کوئریِ aggregate، نه واکشی همهٔ ردیف‌ها و جمع‌زدن در پایتون.
    """
    totals = customer.customer_transactions.filter(owner=owner).aggregate(
        total_debt=Sum("debt"), total_paid=Sum("paid")
    )
    total_debt = totals["total_debt"] or 0
    total_paid = totals["total_paid"] or 0
    return total_paid - total_debt


def recalculate_account(customer, owner):
    """وضعیتِ کش‌شدهٔ مشتری را با واقعیتِ تراکنش‌ها هم‌راست می‌کند.

    باید بعد از هر ساخت/ویرایش/حذفِ تراکنش صدا زده شود. مقدارِ مانده را هم برمی‌گرداند
    تا فراخوان‌کننده برای پاسخِ API دوباره کوئری نزند.
    """
    remainder = calculate_remainder(customer, owner)
    code = account_code_from_remainder(remainder)
    # نوشتن فقط وقتی واقعاً عوض شده — از UPDATEهای بی‌مورد جلوگیری می‌کند
    if customer.code != code:
        customer.code = code
        customer.save(update_fields=["code"])
    return remainder, code


# ---------------------------------------------------------------- فیلترِ دوره

FILTER_CODES = {"debt": AccountCode.DEBT, "credit": AccountCode.CREDIT, "zero": AccountCode.ZERO}


def build_period_query(filter_type):
    """کوئریِ فیلترِ امروز/هفته/ماه/سال روی تقویم شمسی"""
    today = jdatetime.date.fromgregorian(date=timezone.localtime().date())

    if filter_type == "today":
        return Q(year=today.year, month=today.month, day=today.day)
    if filter_type == "week":
        # هفتهٔ شمسی از شنبه شروع می‌شود و jdatetime شنبه را صفر می‌گیرد.
        # به‌جای بازهٔ عددی، هفت شرطِ OR ساخته می‌شود چون هفته می‌تواند از مرز ماه
        # یا حتی سال رد شود و مقایسهٔ عددی آنجا می‌شکند.
        start_of_week = today - jdatetime.timedelta(days=today.weekday())
        q_week = Q()
        for i in range(7):
            day = start_of_week + jdatetime.timedelta(days=i)
            q_week |= Q(year=day.year, month=day.month, day=day.day)
        return q_week
    if filter_type == "month":
        return Q(year=today.year, month=today.month)
    if filter_type == "year":
        return Q(year=today.year)
    return Q()


# ------------------------------------------------------- جستجوی تاریخ شمسی

DIGIT_TRANSLATION_TABLE = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def _to_int(value):
    """تبدیل امنِ ورودیِ کاربر به عدد؛ ارقام فارسی/عربی هم پذیرفته می‌شوند"""
    if value is None or value == "":
        return None
    try:
        return int(str(value).translate(DIGIT_TRANSLATION_TABLE).strip())
    except (TypeError, ValueError):
        return None


def _field_query(field, data, circular):
    """سه حالتِ جستجو برای یک جزءِ تاریخ: مقدار مشخص، بازه، یا چند مقدارِ دلخواه.

    `circular` تفاوتِ کلیدیِ سال با ماه/روز است: در ماه و روز اگر «از» بزرگ‌تر از
    «تا» باشد کاربر منظورش بازه‌ای است که از سرِ سال می‌پیچد (مثلاً ۱۱ تا ۲ یعنی
    بهمن، اسفند، فروردین، اردیبهشت). برای سال چنین چیزی بی‌معناست و صرفاً
    جابه‌جا نوشته شده، پس دو سر بازه عوض می‌شوند.
    """
    if not isinstance(data, dict):
        return None

    specific = _to_int(data.get("specific"))
    if specific is not None:
        return Q(**{field: specific})

    rng = data.get("range")
    if isinstance(rng, (list, tuple)) and len(rng) == 2:
        start, end = _to_int(rng[0]), _to_int(rng[1])
        if start is not None and end is not None:
            if start <= end:
                return Q(**{f"{field}__gte": start, f"{field}__lte": end})
            if circular:
                return Q(**{f"{field}__gte": start}) | Q(**{f"{field}__lte": end})
            return Q(**{f"{field}__gte": end, f"{field}__lte": start})
        if start is not None:
            return Q(**{f"{field}__gte": start})
        if end is not None:
            return Q(**{f"{field}__lte": end})
        return None

    custom = data.get("custom")
    if isinstance(custom, (list, tuple)):
        values = [v for v in (_to_int(item) for item in custom) if v is not None]
        if values:
            return Q(**{f"{field}__in": values})
    return None


def build_date_search_query(year_data, month_data, day_data):
    """ترکیبِ سه جزءِ تاریخ با AND. اگر هیچ‌کدام پر نباشد None برمی‌گردد."""
    queries = [
        q for q in (
            _field_query("year", year_data or {}, circular=False),
            _field_query("month", month_data or {}, circular=True),
            _field_query("day", day_data or {}, circular=True),
        ) if q is not None
    ]
    if not queries:
        return None
    return reduce(lambda x, y: x & y, queries)
