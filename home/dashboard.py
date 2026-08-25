"""محاسبهٔ همهٔ کاشی‌های داشبورد — یک‌جا، اسکوپ‌شده به مالکِ درخواست.

چرا یک ماژولِ جدا و نه داخل ویوها؟ همان دلیلِ `services.py`: اینجا منطقِ دامنه است
(تعریفِ «خوش‌حساب»، «راکد»، سطل‌های سررسید) نه کارِ HTTP. سریالایزری هم ندارد چون
خروجی از هیچ مدلی نمی‌آید؛ چند aggregate است که مستقیم به dict تبدیل می‌شود.

⚠️ **همه‌چیز به مالکِ درخواست محدود است.** هر مشتری می‌تواند نزد چند مالک پرونده
داشته باشد، پس هیچ عددی نباید از تراکنش‌های مالکِ دیگر تغذیه شود. به همین دلیل
وضعیتِ حساب اینجا از روی تراکنش‌های همین مالک حساب می‌شود و نه از ستونِ کش‌شدهٔ
`Customer.code` — آن ستون یکی است برای همهٔ مالکان.
"""
import jdatetime
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import Customer, CustomerOwner, Transaction

# ---------------------------------------------------------------------------

JALALI_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

PERIODS = ("today", "week", "month", "year", "all")
DEFAULT_PERIOD = "year"

PERIOD_LABELS = {
    "today": "امروز", "week": "این هفته", "month": "این ماه",
    "year": "امسال", "all": "کل دوره",
}
# متنِ دلتا باید بگوید با چه چیزی مقایسه شده، وگرنه «۱۲٪ بیشتر» بی‌معناست
PREVIOUS_LABELS = {
    "today": "دیروز", "week": "هفتهٔ گذشته", "month": "ماه گذشته", "year": "سال گذشته",
}

# چند ماهِ شمسی در نمودارِ روند دیده شود
TREND_MONTHS = 12
# سطل‌های سررسیدِ بدهی، بر پایهٔ روزهای گذشته از آخرین تراکنش
AGING_BUCKETS = [(0, 30, "۰ تا ۳۰ روز"), (31, 60, "۳۱ تا ۶۰ روز"),
                 (61, 90, "۶۱ تا ۹۰ روز"), (91, None, "بیش از ۹۰ روز")]
# چند ردیف در فهرست‌های کوتاهِ داشبورد
LIST_SIZE = 5
# از چند روز بی‌تراکنشی، مشتری «راکد» شمرده می‌شود
DORMANT_AFTER_DAYS = 60


def _today_jalali():
    return jdatetime.date.fromgregorian(date=timezone.localtime().date())


def _shift_month(year, month, delta):
    """ماهِ شمسی را جلو/عقب می‌برد و سرریزِ سال را درست می‌کند"""
    index = (year * 12 + (month - 1)) + delta
    return index // 12, index % 12 + 1


def _period_queries(period):
    """کوئریِ دورهٔ جاری و دورهٔ قبلِ هم‌اندازه.

    دومی برای دلتاست: «۱۲٪ بیشتر از ماه گذشته». برای `all` دورهٔ قبلی وجود ندارد،
    پس None برمی‌گردد و فرانت دلتا را نشان نمی‌دهد — عددِ ساختگی بدتر از نبودنش است.
    """
    today = _today_jalali()

    if period == "today":
        yesterday = today - jdatetime.timedelta(days=1)
        return (Q(year=today.year, month=today.month, day=today.day),
                Q(year=yesterday.year, month=yesterday.month, day=yesterday.day))

    if period == "week":
        # هفتهٔ شمسی از شنبه شروع می‌شود و jdatetime شنبه را صفر می‌گیرد. هفت شرطِ
        # OR ساخته می‌شود نه بازهٔ عددی، چون هفته می‌تواند از مرزِ ماه یا سال رد شود.
        def week_of(start):
            q = Q()
            for i in range(7):
                day = start + jdatetime.timedelta(days=i)
                q |= Q(year=day.year, month=day.month, day=day.day)
            return q

        start_of_week = today - jdatetime.timedelta(days=today.weekday())
        return week_of(start_of_week), week_of(start_of_week - jdatetime.timedelta(days=7))

    if period == "month":
        prev_year, prev_month = _shift_month(today.year, today.month, -1)
        return Q(year=today.year, month=today.month), Q(year=prev_year, month=prev_month)

    if period == "year":
        return Q(year=today.year), Q(year=today.year - 1)

    return Q(), None


def _delta_percent(current, previous):
    """درصدِ تغییر. اگر پایه صفر باشد درصد بی‌معناست، پس None برمی‌گردد."""
    if previous is None or previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 1)


def _sums(queryset):
    totals = queryset.aggregate(debt=Coalesce(Sum("debt"), 0), paid=Coalesce(Sum("paid"), 0),
                                count=Count("id"))
    return totals["debt"], totals["paid"], totals["count"]


def _collection_rate(debt, paid):
    """نرخ وصول: چند درصدِ نسیه‌ای که داده‌ای برگشته. بدونِ نسیه، نرخی وجود ندارد."""
    if not debt:
        return None
    return round(min(paid / debt, 1) * 100, 1)


# ------------------------------------------------------------------ کاشی‌ها

def _kpis(transactions, period):
    current_q, previous_q = _period_queries(period)

    debt, paid, count = _sums(transactions.filter(current_q))
    if previous_q is None:
        prev_debt = prev_paid = prev_count = None
    else:
        prev_debt, prev_paid, prev_count = _sums(transactions.filter(previous_q))

    rate = _collection_rate(debt, paid)
    prev_rate = _collection_rate(prev_debt, prev_paid) if previous_q is not None else None

    # ماندهٔ کل عمداً به دوره وابسته نیست: «چقدر طلبکارم» یک عددِ لحظه‌ای از کلِ
    # دفتر است، و محدود کردنش به یک بازه عددی می‌سازد که هیچ معنای حسابداری ندارد
    all_debt, all_paid, all_count = _sums(transactions)

    return {
        "balance": {"value": all_paid - all_debt, "debt": all_debt, "paid": all_paid,
                    "transactions": all_count},
        "debt": {"value": debt, "previous": prev_debt, "delta": _delta_percent(debt, prev_debt)},
        "paid": {"value": paid, "previous": prev_paid, "delta": _delta_percent(paid, prev_paid)},
        "rate": {"value": rate, "previous": prev_rate,
                 "delta": _delta_percent(rate, prev_rate) if rate is not None else None},
        "count": {"value": count, "previous": prev_count, "delta": _delta_percent(count, prev_count)},
    }


def _trend(transactions):
    """نسیه، وصولی و ماندهٔ تجمعی در دوازده ماهِ شمسیِ گذشته.

    ماندهٔ تجمعی از «ماندهٔ ابتدای دوره» شروع می‌شود نه از صفر — وگرنه خطی که
    می‌کشیم وانمود می‌کند دفتر دوازده ماه پیش تسویه بوده.
    """
    today = _today_jalali()
    months = [_shift_month(today.year, today.month, -offset)
              for offset in range(TREND_MONTHS - 1, -1, -1)]
    start_year, start_month = months[0]

    rows = (transactions
            .filter(Q(year__gt=start_year) | Q(year=start_year, month__gte=start_month))
            .values("year", "month")
            .annotate(debt=Coalesce(Sum("debt"), 0), paid=Coalesce(Sum("paid"), 0)))
    by_month = {(row["year"], row["month"]): row for row in rows}

    opening = transactions.filter(
        Q(year__lt=start_year) | Q(year=start_year, month__lt=start_month)
    ).aggregate(debt=Coalesce(Sum("debt"), 0), paid=Coalesce(Sum("paid"), 0))
    balance = opening["paid"] - opening["debt"]

    trend = []
    for year, month in months:
        row = by_month.get((year, month), {})
        debt, paid = row.get("debt", 0), row.get("paid", 0)
        balance += paid - debt
        trend.append({
            "year": year, "month": month,
            "label": JALALI_MONTHS[month - 1],
            "debt": debt, "paid": paid, "balance": balance,
        })
    return trend


def _customer_rows(user):
    """یک کوئری که همهٔ کاشی‌های مشتری‌محور را تغذیه می‌کند.

    عمداً از `owners=user` استفاده نمی‌شود: آن یک JOINِ چندبه‌چند است و کنارِ
    aggregateهای زیر ردیف‌ها را تکثیر می‌کند (fan-out) و مجموع‌ها را بزرگ نشان
    می‌دهد. زیرکوئریِ شناسه چنین مشکلی ندارد.
    """
    owned = CustomerOwner.objects.filter(owner=user).values("customer_id")
    mine = Q(customer_transactions__owner=user)
    return (Customer.objects
            .filter(id__in=owned)
            .annotate(
                total_debt=Coalesce(Sum("customer_transactions__debt", filter=mine), 0),
                total_paid=Coalesce(Sum("customer_transactions__paid", filter=mine), 0),
                tx_count=Count("customer_transactions", filter=mine),
                last_tx=Max("customer_transactions__created", filter=mine),
            ))


def _days_since(moment, now):
    return None if moment is None else max(0, (now - moment).days)


def _customer_tiles(user):
    now = timezone.now()
    rows = list(_customer_rows(user))

    mix = {"debt": 0, "credit": 0, "settled": 0, "untouched": 0}
    debtors, payers, dormant, turnovers = [], [], [], []

    for row in rows:
        balance = row.total_paid - row.total_debt
        days = _days_since(row.last_tx, now)

        # ⚠️ «بی‌حساب» دو معنای کاملاً متفاوت دارد و یکی کردنشان گمراه‌کننده است:
        # کسی که تسویه کرده، و کسی که اصلاً معامله‌ای نکرده. اقدامِ لازم برای این
        # دو یکی نیست، پس در داشبورد هم جدا شمرده می‌شوند.
        if row.tx_count == 0:
            mix["untouched"] += 1
        elif balance < 0:
            mix["debt"] += 1
        elif balance > 0:
            mix["credit"] += 1
        else:
            mix["settled"] += 1

        if balance < 0:
            debtors.append({"id": row.id, "fullname": row.fullname, "phone": row.phone,
                            "amount": -balance, "days": days})

        # «خوش‌حساب» یعنی کسی که نسیه گرفته و پس داده. کسی که هرگز نسیه نگرفته
        # خوش‌حساب نیست، فقط سابقه‌ای ندارد — پس شرطِ total_debt > 0 لازم است.
        if row.total_debt > 0:
            # سقفِ ۱۰۰٪: کسی که بیشتر از نسیه‌اش پرداخته بستانکار است، نه
            # «۱۳۰٪ خوش‌حساب». float() لازم است وگرنه min گاهی intِ ۱ را برمی‌گرداند
            # و خروجی یک‌بار 100 و یک‌بار 100.0 می‌شود.
            ratio = float(min(row.total_paid / row.total_debt, 1))
            payers.append({"id": row.id, "fullname": row.fullname, "phone": row.phone,
                           "ratio": round(ratio * 100, 1), "paid": row.total_paid,
                           "debt": row.total_debt, "days": days})

        if row.tx_count == 0 or (days is not None and days >= DORMANT_AFTER_DAYS):
            dormant.append({"id": row.id, "fullname": row.fullname, "phone": row.phone,
                            "days": days, "never": row.tx_count == 0,
                            "created": row.created})

        turnover = row.total_debt + row.total_paid
        if turnover:
            turnovers.append((turnover, row.fullname))

    debtors.sort(key=lambda c: -c["amount"])
    # نخست نسبتِ وصول، و در تساوی مبلغِ بیشتر — تا «۱۰۰٪ از ۵۰ هزار تومان» بالای
    # «۱۰۰٪ از ۵ میلیون» ننشیند
    payers.sort(key=lambda c: (-c["ratio"], -c["paid"]))
    # راکدترین‌ها اول؛ کسانی که هرگز تراکنشی نداشته‌اند در انتها با تازه‌ترین ثبت‌نام
    dormant.sort(key=lambda c: (c["never"], -(c["days"] or 0)))

    total_debt_amount = sum(c["amount"] for c in debtors)
    for c in debtors:
        c["share"] = round(c["amount"] / total_debt_amount * 100, 1) if total_debt_amount else 0

    return {
        "mix": {**mix, "total": len(rows)},
        "top_debtors": debtors[:LIST_SIZE],
        "debtors_total": {"count": len(debtors), "amount": total_debt_amount},
        "best_payers": payers[:LIST_SIZE],
        "dormant": [{k: v for k, v in c.items() if k != "created"} for c in dormant[:LIST_SIZE]],
        "dormant_total": len(dormant),
        "aging": _aging(debtors),
        "concentration": _concentration(turnovers),
        "customers_total": len(rows),
    }


def _aging(debtors):
    """سررسیدِ بدهی — کلاسیک‌ترین تحلیلِ حساب‌های دریافتنی.

    سنِ بدهی با «روزهای گذشته از آخرین تراکنشِ مشتری» تقریب زده می‌شود. دقیق‌ترش
    عمرِ تک‌تکِ فاکتورهاست، ولی این دفتر فاکتور ندارد؛ هر مشتری یک حسابِ جاری است.
    """
    buckets = [{"label": label, "amount": 0, "count": 0} for _, _, label in AGING_BUCKETS]
    for customer in debtors:
        days = customer["days"] or 0
        for index, (low, high, _) in enumerate(AGING_BUCKETS):
            if days >= low and (high is None or days <= high):
                buckets[index]["amount"] += customer["amount"]
                buckets[index]["count"] += 1
                break
    return buckets


def _concentration(turnovers):
    """چند درصدِ گردشِ دفتر نزدِ پرمعامله‌ترین مشتری است — سنجهٔ ریسکِ تمرکز."""
    if not turnovers:
        return {"top1": 0, "top3": 0, "rest": 0, "top1_name": None, "total": 0}
    turnovers.sort(reverse=True)
    total = sum(amount for amount, _ in turnovers)
    top1 = turnovers[0][0]
    top3 = sum(amount for amount, _ in turnovers[:3])
    return {
        "top1": round(top1 / total * 100, 1),
        "top3": round(top3 / total * 100, 1),
        "rest": round((total - top3) / total * 100, 1),
        "top1_name": turnovers[0][1],
        "total": total,
    }


def _recent(user, transactions):
    recent_tx = [{
        "id": t.id, "customer_id": t.customer_id, "customer_fullname": t.customer.fullname,
        "debt": t.debt, "paid": t.paid, "year": t.year, "month": t.month, "day": t.day,
    } for t in transactions.select_related("customer").order_by("-created", "-id")[:LIST_SIZE]]

    owned = CustomerOwner.objects.filter(owner=user).values("customer_id")
    recent_customers = [{
        "id": c.id, "fullname": c.fullname, "phone": c.phone,
        "created": c.created.isoformat(),
    } for c in Customer.objects.filter(id__in=owned).order_by("-created")[:LIST_SIZE]]

    return recent_tx, recent_customers


# --------------------------------------------------------------- نقطهٔ ورود

def build_dashboard(user, period=DEFAULT_PERIOD):
    """کلِ دادهٔ داشبورد در یک ساختار — تا فرانت هشت درخواستِ جدا نفرستد."""
    if period not in PERIODS:
        period = DEFAULT_PERIOD

    transactions = Transaction.objects.filter(owner=user)
    recent_tx, recent_customers = _recent(user, transactions)
    today = _today_jalali()

    return {
        "period": period,
        "period_label": PERIOD_LABELS[period],
        "previous_label": PREVIOUS_LABELS.get(period),
        "today": {"year": today.year, "month": today.month, "day": today.day,
                  "month_label": JALALI_MONTHS[today.month - 1]},
        "kpi": _kpis(transactions, period),
        "trend": _trend(transactions),
        **_customer_tiles(user),
        "recent_transactions": recent_tx,
        "recent_customers": recent_customers,
    }
