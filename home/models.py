from django.conf import settings
from django.db import models
from django.utils import timezone
import jdatetime


class AccountCode(models.IntegerChoices):
    """وضعیت حساب مشتری — از دید مالک.

    مقادیر عمداً همان اعداد پروژهٔ قدیمی‌اند تا دادهٔ منتقل‌شده معنایش عوض نشود.
    """
    DEBT = -1, "بدهکار"      # مجموع نسیه > مجموع پرداختی
    ZERO = 0, "بی حساب"      # برابرند
    CREDIT = 1, "بستانکار"   # مجموع پرداختی > مجموع نسیه


class Customer(models.Model):
    """مشتریِ یک یا چند مالک.

    ارتباط با مالک از نوع چندبه‌چند است نه کلید خارجیِ ساده، چون یک شمارهٔ مشتری
    می‌تواند نزد چند مالک پرونده داشته باشد؛ ولی هر مالک فقط مشتریانِ خودش را می‌بیند.
    """
    owners = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="CustomerOwner",
        related_name="owner_customers", verbose_name="مالکان"
    )
    fullname = models.CharField(max_length=80, verbose_name="نام و نام خانوادگی")
    phone = models.CharField(max_length=11, verbose_name="شماره تماس")
    created = models.DateTimeField(default=timezone.now, verbose_name="تاریخ ثبت")
    # وضعیتِ حساب کش می‌شود تا صفحهٔ فهرست بتواند بدون JOIN روی تراکنش‌ها فیلتر و
    # مرتب کند. منبعِ حقیقت جدول تراکنش‌هاست؛ هر تغییری آنجا باید
    # home.services.recalculate_account را صدا بزند.
    # برخلاف پروژهٔ قدیمی ستونِ متنیِ status نگه داشته نمی‌شود: با code تکراری بود و
    # می‌توانست از آن واگرا شود. برچسبِ فارسی از get_code_display() می‌آید.
    code = models.IntegerField(choices=AccountCode.choices, default=AccountCode.ZERO, verbose_name="وضعیت حساب")

    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["-created"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self):
        return self.fullname

    @property
    def status(self):
        """برچسب فارسیِ وضعیت — همان رشته‌ای که پروژهٔ قدیمی در ستون جدا نگه می‌داشت"""
        return self.get_code_display()


class CustomerOwner(models.Model):
    """جدول واسطِ مشتری و مالک"""
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="customer_customerOwners", verbose_name="مشتری")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owner_customerOwners", verbose_name="مالک")
    created = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        ordering = ["-created"]
        indexes = [models.Index(fields=["-created"])]
        # جلوگیری از ثبت دوبارهٔ یک مشتری برای یک مالک
        unique_together = ["customer", "owner"]

    def __str__(self):
        return f"Customer: {self.customer} ---> Owner: {self.owner}"


class Transaction(models.Model):
    """یک سطرِ دفتر: نسیه و پرداختی، هر دو به تومان"""
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owner_transactions", verbose_name="مالک")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="customer_transactions", verbose_name="مشتری")
    debt = models.IntegerField(verbose_name="مبلغ نسیه (تومان)", default=0)
    paid = models.IntegerField(verbose_name="مبلغ پرداختی (تومان)", default=0)
    # به‌جای auto_now_add از default استفاده می‌شود تا مقدارش داخل save() در دسترس
    # باشد و تاریخ شمسی از روی همان مقدار محاسبه شود، نه از مقداری که جنگو هنگام
    # INSERT جایگزین می‌کند. ضمناً امکان ثبتِ تراکنشِ عقب‌افتاده را باز می‌گذارد.
    created = models.DateTimeField(default=timezone.now, verbose_name="تاریخ تراکنش")
    # تاریخ شمسی در سه ستونِ عددی نگه داشته می‌شود تا جستجوی بازه‌ای و چندتایی یک
    # WHERE سادهٔ ایندکس‌دار باشد؛ با تبدیلِ درجا هر ردیف باید در پایتون تبدیل می‌شد.
    year = models.PositiveSmallIntegerField(verbose_name="سال شمسی", null=True, blank=True, editable=False)
    month = models.PositiveSmallIntegerField(verbose_name="ماه شمسی", null=True, blank=True, editable=False)
    day = models.PositiveSmallIntegerField(verbose_name="روز شمسی", null=True, blank=True, editable=False)

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["-created"]),
            models.Index(fields=["year", "month", "day"]),
            # فهرستِ تراکنش‌های یک مشتری برای یک مالک، پرتکرارترین کوئریِ این جدول است
            models.Index(fields=["owner", "customer", "-created"]),
        ]

    def save(self, *args, **kwargs):
        if self.created:
            # تبدیل به وقت محلی تهران و بعد گرفتن تاریخ شمسی — بدون localtime،
            # تراکنش‌های بعد از ۲۰:۳۰ به روزِ قبل نسبت داده می‌شوند
            local_created = timezone.localtime(self.created)
            shamsi_date = jdatetime.date.fromgregorian(date=local_created.date())
            self.year = shamsi_date.year
            self.month = shamsi_date.month
            self.day = shamsi_date.day
        super().save(*args, **kwargs)

    def __str__(self):
        return self.customer.fullname
