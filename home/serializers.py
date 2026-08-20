import re

from rest_framework import serializers

from .models import Customer, Transaction

# اعتبارسنجی شماره موبایل ایرانی — همان الگوی اپ account
PHONE_REGEX = re.compile(r"^09(0[1-5]|1[0-9]|2[0-2]|3[035-9]|9[0-9])\d{7}$")
DIGIT_TRANSLATION_TABLE = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def normalize_phone_number(phone):
    cleaned = str(phone or "").translate(DIGIT_TRANSLATION_TABLE).strip()
    cleaned = re.sub(r"[\s\-()]", "", cleaned)
    return re.sub(r"^\+98|^0098|^98", "0", cleaned)


class PhoneField(serializers.CharField):
    """شماره همراه را قبل از اعتبارسنجی نرمال می‌کند تا ارقام فارسی و پیش‌شمارهٔ
    بین‌المللی هم پذیرفته شوند — همان رفتاری که فرم‌های احراز هویت دارند."""

    def to_internal_value(self, data):
        value = normalize_phone_number(super().to_internal_value(data))
        if not PHONE_REGEX.fullmatch(value):
            raise serializers.ValidationError("شماره همراه معتبر نیست.")
        return value


class CustomerSerializer(serializers.ModelSerializer):
    # برچسب فارسیِ وضعیت؛ در مدل ستون جدا ندارد و از code مشتق می‌شود
    status = serializers.CharField(read_only=True)
    fullname = serializers.CharField(max_length=80, min_length=3, error_messages={
        "min_length": "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.",
        "blank": "فیلد نام و نام خانوادگی الزامی است.",
    })
    phone = PhoneField(max_length=11)

    class Meta:
        model = Customer
        fields = ["id", "fullname", "phone", "status", "code", "created"]
        read_only_fields = ["id", "status", "code", "created"]

    def validate_phone(self, value):
        """یک شماره نباید دو بار در دفترِ همین مالک باشد.

        محدودیت در سطحِ مالک است نه سراسری، چون یک شخص می‌تواند مشتریِ چند مالک باشد.
        """
        owner = self.context["request"].user
        queryset = Customer.objects.filter(owners=owner, phone=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("این شماره همراه قبلا در سیستم ثبت شده است.")
        return value


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        # year/month/day فقط‌خواندنی‌اند چون در save() از روی created ساخته می‌شوند
        fields = ["id", "debt", "paid", "created", "year", "month", "day"]
        read_only_fields = ["id", "created", "year", "month", "day"]

    def validate(self, attrs):
        """حداقل یکی از دو مبلغ باید ناصفر باشد، وگرنه تراکنش بی‌معناست."""
        debt = attrs.get("debt", getattr(self.instance, "debt", 0)) or 0
        paid = attrs.get("paid", getattr(self.instance, "paid", 0)) or 0
        if debt < 0 or paid < 0:
            raise serializers.ValidationError({"debt": "مبلغ نمی‌تواند منفی باشد."})
        if debt == 0 and paid == 0:
            raise serializers.ValidationError({"debt": "حداقل یکی از مبلغ نسیه یا پرداختی باید وارد شود."})
        return attrs
