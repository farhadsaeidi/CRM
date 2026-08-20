from rest_framework import serializers
from django.contrib.auth import get_user_model

# دریافت مدل User فعلی پروژه (چه پیش‌فرض Django باشد چه سفارشی)
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # لیست فیلدهایی که در خروجی JSON نمایش داده می‌شوند
        fields = ["id", "fullname", "phone", "role", "image", "created"]
        # همه فیلدها را فقط خواندنی می‌کند، یعنی این سریالایزر فقط برای نمایش
        # اطلاعات است و امکان ایجاد یا ویرایش کاربر از طریق آن وجود ندارد.
        read_only_fields = fields
