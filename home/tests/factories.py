"""سازنده‌های مشترکِ تست‌ها.

هدف این است که هر تست فقط چیزی را بسازد که واقعاً به آن نگاه می‌کند، نه یک fixture
بزرگ که هیچ‌کس نمی‌داند کدام ردیفش مهم است.
"""
import jdatetime
from django.contrib.auth import get_user_model
from django.utils import timezone

from home.models import Customer, CustomerOwner, Transaction

User = get_user_model()

# شماره‌های تست باید از الگوی PHONE_REGEX رد شوند (پیش‌شماره‌های معتبر اپراتوری)
_phone_counter = iter(range(1000000, 9999999))


def next_phone():
    return f"0912{next(_phone_counter)}"


def make_owner(phone=None, password="test1234", **extra):
    return User.objects.create_user(
        phone=phone or next_phone(),
        password=password,
        fullname=extra.pop("fullname", "مالک آزمایشی"),
        **extra,
    )


def make_customer(owner, fullname="مشتری آزمایشی", phone=None, created=None):
    """مشتری + پیوندش با مالک. مشتریِ بی‌مالک در هیچ فهرستی دیده نمی‌شود."""
    customer = Customer.objects.create(
        fullname=fullname,
        phone=phone or next_phone(),
        created=created or timezone.now(),
    )
    CustomerOwner.objects.create(customer=customer, owner=owner)
    return customer


def jalali_to_datetime(year, month, day, hour=12):
    """یک لحظهٔ ظهرِ همان روزِ شمسی، به وقتِ محلی.

    ظهر انتخاب شده تا تبدیلِ منطقهٔ زمانی روز را جابه‌جا نکند — با نیمه‌شب،
    تراکنش می‌تواند به روزِ قبل یا بعد نسبت داده شود.
    """
    gregorian = jdatetime.date(year, month, day).togregorian()
    naive = timezone.datetime(gregorian.year, gregorian.month, gregorian.day, hour, 0)
    return timezone.make_aware(naive, timezone.get_current_timezone())


def make_transaction(owner, customer, debt=0, paid=0, created=None, jalali=None):
    """تراکنش با تاریخِ دلخواه.

    `jalali=(سال, ماه, روز)` راحت‌ترین راه است چون ستون‌های شمسی همان چیزی‌اند که
    فیلترِ دوره و جستجوی تاریخ رویشان کار می‌کنند.
    """
    if jalali is not None:
        created = jalali_to_datetime(*jalali)
    return Transaction.objects.create(
        owner=owner, customer=customer, debt=debt, paid=paid,
        created=created or timezone.now(),
    )


def today_jalali():
    return jdatetime.date.fromgregorian(date=timezone.localtime().date())
