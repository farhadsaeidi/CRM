from django.conf import settings
from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    """یک گفتگوی دستیار، متعلق به یک مالک.

    چرا اپِ جدا و نه داخلِ `home`؟ برخلافِ `SMSLog` که یک مدلِ تنها بود، اینجا یک
    دامنهٔ کامل است: گفتگو، پیام، تعریفِ ابزارها و موتورِ پاسخ. جمع کردنشان در
    `home` یعنی اپی که هم دفترداری می‌کند هم گفتگو.
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="conversations", verbose_name="مالک",
    )
    # عنوان از اولین پیامِ کاربر ساخته می‌شود، نه با یک فراخوانیِ جدا به مدل:
    # یک درخواستِ اضافه برای چیزی که فقط برچسبِ فهرستِ کناری است صرف نمی‌کند.
    title = models.CharField(max_length=80, default="گفتگوی جدید", verbose_name="عنوان")
    created = models.DateTimeField(default=timezone.now, verbose_name="تاریخ ایجاد")
    # جدا از `created` نگه داشته می‌شود تا فهرستِ کناری بر اساسِ آخرین فعالیت
    # مرتب شود نه تاریخِ ساخت — گفتگویی که دیروز باز شده و امروز ادامه یافته
    # باید بالای فهرست باشد.
    updated = models.DateTimeField(default=timezone.now, verbose_name="آخرین فعالیت")
    # مدلی که کاربر برای همین گفتگو انتخاب کرده. خالی یعنی «پیش‌فرضِ `.env`».
    #
    # ⚠️ روی گفتگو می‌نشیند نه روی کاربر: مقایسهٔ دو مدل روی یک سوال کارِ رایجی
    # است و با تنظیمِ سراسری یعنی هر بار عوض کردنِ یک گزینه در جای دیگر. ضمناً
    # این‌طور با رفرشِ صفحه هم انتخاب سرِ جایش می‌ماند.
    model = models.CharField(max_length=80, blank=True, default="", verbose_name="مدل زبانی")

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        ordering = ["-updated"]
        indexes = [models.Index(fields=["owner", "-updated"])]

    def __str__(self):
        return f"{self.owner.phone} | {self.title}"

    def touch(self):
        self.updated = timezone.now()
        self.save(update_fields=["updated"])


class Message(models.Model):
    """یک پیام در گفتگو.

    نقشِ `tool` عمداً ذخیره **نمی‌شود**: نتیجهٔ خامِ ابزارها دادهٔ لحظه‌ای است و
    دفعهٔ بعد باید از نو خوانده شود، وگرنه دستیار جوابِ کهنه را دوباره تحویل
    می‌دهد. آنچه می‌ماند همان چیزی است که کاربر دید.
    """

    class Role(models.TextChoices):
        USER = "user", "کاربر"
        ASSISTANT = "assistant", "دستیار"

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE,
        related_name="messages", verbose_name="گفتگو",
    )
    role = models.CharField(max_length=10, choices=Role.choices, verbose_name="نقش")
    body = models.TextField(verbose_name="متن")
    # نامِ ابزارهایی که برای ساختنِ این پاسخ صدا زده شدند. برای نمایشِ «این عدد از
    # کجا آمد» به کاربر، و برای عیب‌یابی وقتی جواب پرت است.
    tools_used = models.JSONField(default=list, blank=True, verbose_name="ابزارهای استفاده‌شده")
    # پیشنهادِ عملِ ساختاریافته (مثلاً «به این پنج بدهکار پیامک بفرست»). خودِ
    # دستیار هیچ‌وقت اجرا نمی‌کند؛ فرانت این را به دکمه تبدیل می‌کند و کاربر
    # تصمیم می‌گیرد. `null` یعنی پیشنهادی نبوده.
    suggestion = models.JSONField(null=True, blank=True, verbose_name="پیشنهاد عمل")
    created = models.DateTimeField(default=timezone.now, verbose_name="زمان")

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["created", "id"]
        indexes = [models.Index(fields=["conversation", "created"])]

    def __str__(self):
        return f"{self.role}: {self.body[:40]}"
