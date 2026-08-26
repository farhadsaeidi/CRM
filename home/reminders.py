"""یادآوریِ پیامکیِ بدهی.

منطقِ دامنه‌اش اینجاست نه در ویو — همان جدایی که `services.py` و `dashboard.py`
دارند. ارتباط با کاوه‌نگار هم مثل همیشه از `account/services.py` می‌رود؛ اینجا
فقط تصمیم می‌گیرد **به چه کسی**، **چه متنی** و **چه وقت**.
"""
from django.conf import settings
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from account.models import SMSLog
from account.services import OtpSendError, send_token_sms

from .models import Customer, CustomerOwner

# رویدادی که در SMSLog ثبت می‌شود — هم برای گزارش و هم برای همان بازهٔ خاموشی
REMINDER_EVENT = "debt_reminder"

# ⚠️ تا این چند ساعت به همان مشتری یادآوریِ دوباره فرستاده نمی‌شود. پیامکِ تکراری
# هم پول است هم مشتری را می‌رنجاند، و «دوبار کلیک کردن» اتفاقِ رایجی است.
COOLDOWN_HOURS = 24


def format_amount(value):
    """مبلغ با جداکنندهٔ سه‌رقمی و ارقامِ لاتین.

    ارقامِ فارسی عمداً فرستاده نمی‌شوند: توکنِ کاوه‌نگار رویشان سخت‌گیر است و
    گوشی همین را هم درست نشان می‌دهد.
    """
    return f"{int(value):,}"


def build_debtor_list(user):
    """بدهکارانی که می‌شود به آن‌ها یادآوری فرستاد.

    فقط مشتریانی که مانده‌شان منفی است — یعنی نسیه‌شان از پرداختی‌شان بیشتر است.
    وضعیت از تراکنش‌های همین مالک حساب می‌شود نه از ستونِ کش‌شدهٔ `Customer.code`،
    چون آن ستون بین همهٔ مالکانِ یک مشتری مشترک است.
    """
    owned = CustomerOwner.objects.filter(owner=user).values("customer_id")
    mine = Q(customer_transactions__owner=user)
    now = timezone.now()

    # آخرین یادآوریِ هر شماره، برای همان بازهٔ خاموشی
    since = now - timezone.timedelta(hours=COOLDOWN_HOURS)
    recently_reminded = set(
        SMSLog.objects
        .filter(event=REMINDER_EVENT, created__gte=since,
                status__in=[SMSLog.SendStatus.SENT, SMSLog.SendStatus.DEV])
        .values_list("to_phone", flat=True)
    )

    rows = []
    customers = (Customer.objects
                 .filter(id__in=owned)
                 .annotate(
                     total_debt=Coalesce(Sum("customer_transactions__debt", filter=mine), 0),
                     total_paid=Coalesce(Sum("customer_transactions__paid", filter=mine), 0),
                     last_tx=Max("customer_transactions__created", filter=mine),
                     tx_count=Count("customer_transactions", filter=mine),
                 )
                 .order_by("fullname"))

    for customer in customers:
        balance = customer.total_paid - customer.total_debt
        if balance >= 0:
            continue
        rows.append({
            "id": customer.id,
            "fullname": customer.fullname,
            "phone": customer.phone,
            "amount": -balance,
            "days": None if customer.last_tx is None else max(0, (now - customer.last_tx).days),
            "recently_reminded": customer.phone in recently_reminded,
        })

    rows.sort(key=lambda row: -row["amount"])
    return {
        "business_name": user.business_name,
        "cooldown_hours": COOLDOWN_HOURS,
        "rows": rows,
        "total": {"count": len(rows), "amount": sum(row["amount"] for row in rows)},
    }


def send_reminders(user, customer_ids):
    """ارسالِ یادآوری به مشتریانِ انتخاب‌شده.

    هر ارسال جداست و شکستِ یکی بقیه را متوقف نمی‌کند — با ده گیرنده، یک خطای
    شبکه نباید نه نفرِ دیگر را از دست بدهد. نتیجهٔ هر کدام جدا برگردانده می‌شود.
    """
    if not user.business_name:
        return None   # ویو خودش پیامِ مناسب را می‌سازد

    catalogue = {row["id"]: row for row in build_debtor_list(user)["rows"]}
    template = settings.SMS_TEMPLATE_DEBT_REMINDER

    sent, skipped, failed = [], [], []
    for customer_id in customer_ids:
        row = catalogue.get(customer_id)
        # شناسه‌ای که بدهکارِ این مالک نیست اصلاً در فهرست نیست — نه ۴۰۴ لازم است
        # نه پیامی: در پاسخ به‌عنوان «رد شده» می‌آید
        if row is None:
            skipped.append({"id": customer_id, "reason": "not_debtor"})
            continue
        if row["recently_reminded"]:
            skipped.append({"id": customer_id, "fullname": row["fullname"], "reason": "cooldown"})
            continue

        try:
            # ⚠️ نامِ کسب‌وکار فاصله دارد، پس باید `token10` برود؛ `token` و
            # `token2` و `token3` فاصله نمی‌پذیرند (خطای ۴۳۱ کاوه‌نگار).
            send_token_sms(
                phone=row["phone"],
                template=template,
                token=format_amount(row["amount"]),
                event=REMINDER_EVENT,
                token10=user.business_name,
            )
            sent.append({"id": row["id"], "fullname": row["fullname"]})
        except OtpSendError as error:
            failed.append({"id": row["id"], "fullname": row["fullname"], "reason": error.message})

    return {"sent": sent, "skipped": skipped, "failed": failed}
