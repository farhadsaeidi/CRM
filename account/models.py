from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser
from functools import partial
from django.utils import timezone
from django.utils.text import get_valid_filename
import os
import uuid


class MyUserManager(BaseUserManager):
    def create_user(self, fullname, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("User must have a phone number")
        if not fullname:
            raise ValueError("User must have a fullname")

        user = self.model(fullname=fullname, phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, fullname, phone, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', Roles.SUPERUSER)
        return self.create_user(fullname=fullname, phone=phone, password=password, **extra_fields)


def upload_file(instance, filename, upload_dir):
    now_time = timezone.now().strftime("%Y%m%d%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = get_valid_filename(filename)
    name, ext = os.path.splitext(filename)
    # محدود کردن طول نام فایل
    name = name[:50] if len(name) > 50 else name
    new_filename = f"{now_time}_{unique_id}_{name}{ext}"
    return os.path.join(upload_dir, new_filename)


class Roles(models.TextChoices):
    SUPERUSER = "superuser", "سوپریوزر"
    OWNER = "owner", "مالک"


class MyUser(AbstractBaseUser):
    """مالکِ کسب‌وکار — کاربرِ اصلیِ سامانه.

    برخلاف SAM اینجا نقش‌های متعدد لازم نیست: هر کاربر یا مالکِ عادی است یا سوپریوزر.
    ولی نقش به‌صورت فیلد نگه داشته می‌شود (نه یک بولینِ is_superuser) تا اگر بعداً
    نقشِ سومی لازم شد، اضافه کردنش مهاجرتِ داده نخواهد.
    """
    fullname = models.CharField(max_length=100, verbose_name="نام و نام خانوادگی")
    phone = models.CharField(max_length=11, unique=True, verbose_name="شماره تلفن")
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.OWNER, verbose_name="نقش")
    # آدرس در ثبت‌نام گرفته نمی‌شود و جایش صفحهٔ پروفایل است — ۱۲ کاربرِ
    # منتقل‌شده از پروژهٔ قدیمی هم آدرس ندارند
    address = models.CharField(max_length=300, blank=True, verbose_name="نشانی")
    created = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # لازمه ورود به پنل ادمین جنگو
    image = models.ImageField(
        upload_to=partial(upload_file, upload_dir="user/upload/"),
        default="user/default/user3.png",
        blank=True,
        null=True,
        verbose_name="تصویر پروفایل"
    )
    otp = models.PositiveIntegerField(blank=True, null=True, verbose_name="کد یکبار مصرف")
    otp_time = models.DateTimeField(blank=True, null=True, verbose_name="زمان ارسال کد یکبار مصرف")

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["fullname"]
    objects = MyUserManager()

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(fields=['-created']),
            models.Index(fields=['phone'])
        ]

    def __str__(self):
        return self.fullname

    @property
    def is_superuser(self):
        """به‌جای ستون جداگانه، از نقش خوانده می‌شود (سازگار با قالب‌های ادمین جنگو)"""
        return self.role == Roles.SUPERUSER

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class SMSLog(models.Model):
    """ثبت تمام پیامک‌های ارسالی (رهگیری، هزینه، خطاها).

    در SAM این مدل داخل اپ `comms` است چون آنجا دامنهٔ پیام‌رسانی وجود دارد. اینجا
    تنها پیامک‌های سامانه احراز هویتی‌اند (کد یکبار مصرف و رمز فراموش‌شده)، پس
    ساختنِ یک اپ جدا برای یک مدل بی‌مورد بود.

    نکتهٔ امنیتی: هرگز خودِ کد یکبار مصرف یا رمز عبور در `body` ذخیره نمی‌شود —
    این جدول از پنل ادمین قابل خواندن است و لاگ نباید به کلیدِ ورود تبدیل شود.
    """

    class SendStatus(models.TextChoices):
        SENT = "sent", "ارسال شد"
        FAILED = "failed", "ناموفق"
        DEV = "dev", "حالت توسعه"

    to_phone = models.CharField(max_length=11, verbose_name="گیرنده")
    body = models.TextField(verbose_name="متن")
    event = models.CharField(max_length=40, blank=True, verbose_name="رویداد")
    status = models.CharField(max_length=10, choices=SendStatus.choices,
                              default=SendStatus.DEV, verbose_name="وضعیت")
    error = models.CharField(max_length=300, blank=True, verbose_name="خطا")
    created = models.DateTimeField(auto_now_add=True, verbose_name="زمان")

    class Meta:
        ordering = ["-created"]
        indexes = [models.Index(fields=["-created"])]
        verbose_name = "پیامک"
        verbose_name_plural = "پیامک‌ها"

    def __str__(self):
        return f"{self.to_phone} | {self.event} | {self.status}"
