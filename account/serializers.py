from rest_framework import serializers
from django.contrib.auth import get_user_model

# دریافت مدل User فعلی پروژه (چه پیش‌فرض Django باشد چه سفارشی)
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # لیست فیلدهایی که در خروجی JSON نمایش داده می‌شوند
        fields = ["id", "fullname", "phone", "role", "address", "image", "created"]
        # همه فیلدها را فقط خواندنی می‌کند، یعنی این سریالایزر فقط برای نمایش
        # اطلاعات است و امکان ایجاد یا ویرایش کاربر از طریق آن وجود ندارد.
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """ویرایشِ پروفایل توسطِ خودِ کاربر.

    ⚠️ `phone` عمداً اینجا نیست: همان `USERNAME_FIELD` است و عوض کردنش یعنی عوض
    شدنِ هویتِ ورود — کاری که فلوی خودش را می‌خواهد (تایید با کد یکبارمصرفِ شمارهٔ
    تازه)، نه یک فیلدِ ساده در فرمِ پروفایل. صفحهٔ پروفایل شماره را فقط نشان می‌دهد.
    """

    fullname = serializers.CharField(max_length=100, min_length=3, error_messages={
        "min_length": "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.",
        "blank": "فیلد نام و نام خانوادگی الزامی است.",
    })
    address = serializers.CharField(max_length=300, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["fullname", "address", "image"]
